import { AuthorizationData, ECRClient, GetAuthorizationTokenCommand } from '@aws-sdk/client-ecr'
import { filterNonNullable, filterOutError, PullImageProgress } from '@docker-console/common'
import { TpConfigData, TpService } from '@tarpit/core'
import readline from 'node:readline'
import { BehaviorSubject, catchError, defaultIfEmpty, filter, finalize, find, from, fromEvent, map, merge, Observable, of, startWith, Subject, switchMap, takeUntil, tap, timer } from 'rxjs'
import { AWS_DockerRepo } from '../types'
import { DockerService } from './docker.service'

function rollupDockerPullProgress(progress: PullImageProgress): (source: Observable<any>) => Observable<PullImageProgress> {
    return map(msg => {
        if (!msg) {
            return progress
        }
        if (msg.status.startsWith('Pulling from ')) {
            // pass
        } else if (msg.id) {
            if (!progress.layers.includes(msg.id)) {
                progress.layers.push(msg.id)
            }
            if (!progress.layer_status[msg.id]) {
                progress.layer_status[msg.id] = {
                    id: msg.id,
                    status: msg.status,
                    current: 0,
                    total: 0,
                    progress_bar: '',
                }
            }
            if (msg.progressDetail?.total) {
                progress.layer_status[msg.id].current = msg.progressDetail.current
                progress.layer_status[msg.id].total = msg.progressDetail.total
            }
            progress.layer_status[msg.id].status = msg.status
        } else if (msg.status.startsWith('Status: Downloaded newer image for')) {
            progress.status = 'completed'
        }
        progress.updated_at = Date.now()
        return progress
    })
}

function read_line_by_line(stream: NodeJS.ReadableStream, on_error?: (err: any) => void): Observable<string> {
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    })
    return merge(
        fromEvent(rl, 'line', (line: string) => line),
        fromEvent(rl, 'error').pipe(
            switchMap(err => {
                on_error?.(err)
                throw err
            }),
        )
    ).pipe(
        takeUntil(fromEvent(rl, 'close')),
        finalize(() => rl.close()),
    )
}

@TpService()
export class DownloadService {

    queue: PullImageProgress[] = []
    history: PullImageProgress[] = []
    current?: PullImageProgress
    queue_event$ = new BehaviorSubject<{ queue?: PullImageProgress[], history?: PullImageProgress[] }>({})
    progress_event$ = new BehaviorSubject<PullImageProgress | undefined>(undefined)
    refresh_pulling$ = new Subject()
    stop_pulling$ = new Subject()

    private pull_image$ = new Subject()
    private registry_domain: Record<string, string> = {}
    private registry_map: Record<string, AWS_DockerRepo & { token?: string, token_expires?: number }> = {}

    constructor(
        private _config: TpConfigData,
        private _docker: DockerService,
    ) {
        this._config.get('ndc.docker_repo').forEach(data => {
            this.registry_map[data.host] = data
            this.registry_domain[data.host] = data.host
            data.alias.forEach(name => this.registry_domain[name] = data.host)
        })
        this._docker.docker_up$.pipe(
            switchMap(() => timer(0, 500).pipe(
                tap(() => this.pull_image$.next(null)),
                takeUntil(this._docker.docker_down$)
            )),
            takeUntil(this._docker.off$),
        ).subscribe()
        this.pull_image$.pipe(
            filter(() => !this.current),
            map(() => this.current = this.queue.shift()),
            tap(() => this._emit_queue_event()),
            filterNonNullable(),
            switchMap(info => of(null).pipe(
                tap(() => logger.info('start pulling image %s', info.image_tag)),
                switchMap(() => this._process_ensure_token(info)),
                switchMap(() => this._process_check_image_exists(info)),
                switchMap(() => this._process_check_remote_image_exists(info)),
                switchMap(() => this._process_pull_image(info)),
                tap(() => {
                    if (info.status === 'completed') {
                        info.on_fulfilled()
                        logger.info('pull image %s: completed', info.image_tag)
                    } else if (info.status === 'aborted') {
                        info.on_fulfilled(new Error(`pull image ${info.image_tag}: aborted`))
                        logger.info('pull image %s: aborted', info.image_tag)
                    } else {
                        info.on_fulfilled(new Error(`pull image ${info.image_tag}: unreasonable status ${info.status}`))
                        logger.warn('pull image %s: unreasonable status %s', info.image_tag, info.status)
                    }
                    this._archive_history()
                }),
                filterOutError(err => {
                    if (info.status !== 'completed') {
                        logger.info('Error occurred when pulling image %s %O', info.image_tag, err)
                        this._update_task(info, { status: 'aborted' })
                        info.on_fulfilled(new Error(`pull image ${info.image_tag}: aborted`))
                    }
                    info.on_fulfilled()
                    this._archive_history()
                }),
            )),
            takeUntil(this._docker.off$),
            finalize(() => logger.info('monitoring pull image finished')),
        ).subscribe()
    }

    create_pulling_task(tag: string) {
        const [image, version_tag] = tag.split(':')
        if (!version_tag) {
            tag = `${image}:latest`
        }
        const task: PullImageProgress = {
            task_id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            image_tag: tag,
            layers: [],
            layer_status: {},
            status: 'queueing',
            promise: null as any,
            on_fulfilled: null as any,
            created_at: Date.now(),
            updated_at: Date.now(),
        }
        task.promise = new Promise<void>((resolve, reject) => {
            task.on_fulfilled = (err?: any) => err ? reject(err) : resolve()
        })
        this.queue.push(task)
        this._emit_queue_event()
        this.pull_image$.next(null)
        return task
    }

    private _emit_queue_event() {
        this.queue_event$.next({ queue: this.queue, history: this.history })
    }

    private _update_task(task: PullImageProgress, updater: Partial<PullImageProgress>) {
        Object.assign(task, updater)
        this.progress_event$.next(task)
    }

    private _get_auth_headers(tag: string): Record<string, string | undefined> {
        const [domain] = tag.split('/', 1)
        if (this.registry_domain[domain]) {
            return { 'X-Registry-Auth': this.registry_map[this.registry_domain[domain]].token }
        } else {
            return {}
        }
    }

    private _archive_history() {
        if (this.current) {
            this.history.push(this.current)
            if (this.history.length > 20) {
                this.history.shift()
            }
            this.current = undefined
            this.progress_event$.next(undefined)
            this._emit_queue_event()
        }
    }

    private _process_ensure_token(info: PullImageProgress): Observable<AuthorizationData | null> {
        logger.info('check registry token')
        this._update_task(info, { status: 'generate_token' })
        const [domain] = info.image_tag.split('/', 1)
        if (!this.registry_domain[domain]) {
            return of(null)
        }
        const registry_data = this.registry_map[this.registry_domain[domain]]
        if (registry_data.token && Date.now() < registry_data.token_expires!) {
            return of(null)
        }
        return of(null).pipe(
            switchMap(() => {
                const client = new ECRClient({
                    region: registry_data.region,
                    credentials: {
                        accessKeyId: registry_data.access_key_id,
                        secretAccessKey: registry_data.secret_access_key,
                    }
                })
                const command = new GetAuthorizationTokenCommand({})
                return from(client.send(command))
            }),
            tap(() => logger.info('aws token generated')),
            map(res => res.authorizationData?.[0]!),
            filter(data => !!data),
            tap(data => {
                const token = Buffer.from(data.authorizationToken!, 'base64').toString('utf-8')
                const [username, password] = token.split(':')
                registry_data.token = Buffer.from(JSON.stringify({ username, password })).toString('base64')
                registry_data.token_expires = data.expiresAt!.valueOf()
            }),
            tap(() => {
                logger.info('check token pass')
            }),
        )
    }

    private _process_check_image_exists(info: PullImageProgress) {
        logger.info('check image exists locally %s', info.image_tag)
        this._update_task(info, { status: 'check_local' })
        return of(null).pipe(
            switchMap(() => this._docker.inspect_image(info.image_tag)),
            tap(exists => {
                if (exists.Id) {
                    this._update_task(info, { status: 'completed', local_exists: true })
                    throw new Error(`Image ${info.image_tag} exists locally.`)
                }
            }),
            tap(() => this._update_task(info, { local_exists: false })),
            tap(() => logger.info(`check image exists locally ${info.image_tag}: not exists`)),
        )
    }

    private _process_check_remote_image_exists(info: PullImageProgress) {
        logger.info('check image exists remotely %s', info.image_tag)
        this._update_task(info, { status: 'check_remote' })
        return of(null).pipe(
            switchMap(() => this._docker.get_image_information(info.image_tag, this._get_auth_headers(info.image_tag))),
            tap(data => console.log(data)),
            map(data => data.Descriptor),
            tap(exists => {
                if (!exists) {
                    this._update_task(info, { status: 'aborted', remote_exists: false })
                    throw new Error(`Image ${info.image_tag} not exists remotely.`)
                }
            }),
            tap(() => this._update_task(info, { remote_exists: true })),
            tap(() => logger.info('check image exists remotely %s: exists', info.image_tag)),
        )
    }

    private async _request_pull_image(info: PullImageProgress, controller: AbortController) {
        const [fromImage, tag] = info.image_tag.split(':')
        return this._docker.create_image(controller.signal, { fromImage, tag }, this._get_auth_headers(info.image_tag))
    }

    private _process_pull_image(info: PullImageProgress) {
        const [fromImage, tag] = info.image_tag.split(':')
        logger.info('pull image %s', info.image_tag)
        this._update_task(info, { status: 'pull_image' })
        return this.refresh_pulling$.pipe(
            startWith(null),
            map(() => new AbortController),
            switchMap(controller => of(null).pipe(
                tap(() => {
                    info.layers = []
                    info.layer_status = {}
                    this.progress_event$.next(info)
                }),
                switchMap(() => this._request_pull_image(info, controller)),
                filter(res => !!res),
                switchMap(res => read_line_by_line(res!.data, () => controller.abort())),
                map(line => JSON.parse(line)),
                catchError(err => {
                    logger.error('Error on request image %s:%s %O', fromImage, tag, err)
                    return of(null)
                }),
                takeUntil(this.refresh_pulling$),
                finalize(() => controller.abort()),
            )),
            rollupDockerPullProgress(info),
            tap(() => this.progress_event$.next(info)),
            find(() => info.status === 'completed' || info.status === 'aborted'),
            map(() => info),
            takeUntil(this.stop_pulling$.pipe(
                tap(() => info.status = 'aborted'),
            )),
            defaultIfEmpty(info),
        )
    }
}
