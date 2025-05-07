import { DockerApi, filterOutError } from '@docker-console/common'
import { Injector, TpConfigData, TpService } from '@tarpit/core'
import axios, { AxiosError, AxiosResponse } from 'axios'
import { Stats } from 'fs'
import * as fs from 'fs/promises'
import http from 'node:http'
import net from 'node:net'
import * as path from 'node:path'
import { PassThrough } from 'node:stream'
import { finished } from 'node:stream/promises'
import readline from 'readline'
import { BehaviorSubject, distinctUntilChanged, filter, finalize, forkJoin, fromEvent, merge, mergeMap, of, switchMap, takeUntil, tap, timer } from 'rxjs'
import * as tar from 'tar'

const if_catch = (desc: string) => <T extends AxiosError>(err: T) => {
    logger.debug('Error occurred when %s: %s %d %O', desc, err.message, err.response?.status ?? 0, err.response?.data ?? {})
    throw err
}

const get_data = <T extends AxiosResponse>(res: T): T extends AxiosResponse<infer DATA> ? DATA : never => {
    return res.data
}

@TpService()
export class DockerService {

    version_data?: DockerApi.VersionInformation
    hostname = process.env.HOSTNAME ?? ''
    container_id = ''
    inside_container = process.env.NDC_ENVIRONMENT === 'container'
    on$ = fromEvent(this._injector, 'start')
    off$ = fromEvent(this._injector, 'terminate')

    private _docker_healthy$ = new BehaviorSubject<'running' | 'not_found' | 'inaccessible' | 'unknown'>('unknown')
    docker_healthy$ = this._docker_healthy$.pipe(distinctUntilChanged())
    docker_up$ = this.docker_healthy$.pipe(filter(status => status === 'running'))
    docker_down$ = this.docker_healthy$.pipe(filter(status => status !== 'running'))

    readonly containers: Record<string, DockerApi.ContainerDetail> = {}
    readonly networks: Record<string, DockerApi.NetworkDetail> = {}
    readonly volumes: Record<string, DockerApi.VolumeDetail> = {}
    readonly images: Record<string, DockerApi.ImageDetail> = {}

    private _containers$ = new BehaviorSubject<Record<string, DockerApi.ContainerDetail>>(this.containers)
    containers$ = this._containers$.pipe()
    private _networks$ = new BehaviorSubject<Record<string, DockerApi.NetworkDetail>>(this.networks)
    networks$ = this._networks$.pipe()
    private _volumes$ = new BehaviorSubject<Record<string, DockerApi.VolumeDetail>>(this.volumes)
    volumes$ = this._volumes$.pipe()
    private _images$ = new BehaviorSubject<Record<string, DockerApi.ImageDetail>>(this.images)
    images$ = this._images$.pipe()

    readonly api_version = 'v1.41'
    readonly base_url = `http://localhost/${this.api_version}`

    private _socket_path = this._config.get('ndc.socket_path')
    private _axios = axios.create({
        socketPath: this._socket_path,
        baseURL: this.base_url,
    })

    constructor(
        private _injector: Injector,
        private _config: TpConfigData,
    ) {
        if (!this.inside_container) {
            process.env['NDC_DATA_PATH'] = path.join(this._config.get('ndc.data_path'), 'data')
        }
        this.on$.pipe(
            switchMap(() => timer(0, 500).pipe(
                switchMap(() => of(null).pipe(
                    switchMap(() => fs.stat(this._socket_path)),
                    filterOutError(err => {
                        if (this._docker_healthy$.value !== 'not_found') {
                            logger.error('The Docker socket file was not found. %O', err)
                            this._docker_healthy$.next('not_found')
                        }
                    }),
                    switchMap(() => this.get_version()),
                    filterOutError(err => {
                        if (this._docker_healthy$.value !== 'inaccessible') {
                            logger.error('The Docker Engine cannot be accessed. %O', err)
                            this._docker_healthy$.next('inaccessible')
                        }
                    }),
                    tap(data => {
                        if (this._docker_healthy$.value !== 'running') {
                            this.version_data = data
                            logger.info('Docker Engine detected.')
                            this._docker_healthy$.next('running')
                        }
                    }),
                )),
            )),
            takeUntil(this.off$),
        ).subscribe()
        this.docker_up$.pipe(
            switchMap(() => of(null).pipe(
                switchMap(() => forkJoin([
                    this.list_containers({ all: true }).then(async containers => Promise.all(containers.map(async c => {
                        const info = await this.inspect_container(c.Id)
                        if (info.Id) {
                            if (this.inside_container && !this.container_id && info.Config.Hostname === this.hostname && info.Config.Image === 'plankroot/docker-console') {
                                this.container_id = info.Id
                                const data_mount = info.Mounts.find(m => m.Destination === '/docker-console')
                                if (data_mount && data_mount.Type === 'bind') {
                                    const data_path = data_mount.Source
                                    process.env['NDC_DATA_PATH'] = path.join(data_path, 'data')
                                }
                            }
                            this.containers[c.Id] = info
                        }
                    }))),
                    this.list_images({ all: true }).then(async images => Promise.all(images.map(async img => {
                        const info = await this.inspect_image(img.Id)
                        if (info.Id) {
                            this.images[img.Id] = info
                        }
                    }))),
                    this.list_networks().then(async networks => {
                        for (const network of networks) {
                            this.networks[network.Id] = network
                        }
                    }),
                    this.list_volumes().then(async volumes => {
                        for (const volume of volumes.Volumes) {
                            this.volumes[volume.Name] = volume
                        }
                    }),
                ])),
                switchMap(() => this.monitor_events()),
                mergeMap(async event => {
                    logger.debug('monitor event: %O', event)
                    if (event.Type === 'container') {
                        const id = event.Actor.ID
                        const info = await this.inspect_container(id)
                        if (info.Id) {
                            this.containers[info.Id] = info
                        } else {
                            delete this.containers[id]
                        }
                        this._containers$.next(this.containers)
                    } else if (event.Type === 'network') {
                        const id = event.Actor.ID
                        const info = await this.inspect_network(id)
                        if (info.Id) {
                            this.networks[info.Id] = info
                        } else {
                            delete this.networks[id]
                        }
                        this._networks$.next(this.networks)
                    } else if (event.Type === 'volume') {
                        const id = event.Actor.ID
                        const info = await this.inspect_volume(id)
                        if (info.Name) {
                            this.volumes[info.Name] = info
                        } else {
                            delete this.volumes[id]
                        }
                        this._volumes$.next(this.volumes)
                    } else if (event.Type === 'image') {
                        const id = event.Actor.ID
                        const info = await this.inspect_image(id)
                        if (info.Id) {
                            this.images[info.Id] = info
                        } else {
                            delete this.images[id]
                        }
                        this._images$.next(this.images)
                    }
                    return of(null)
                }, 1),
                takeUntil(this.docker_down$),
            ))
        ).subscribe()
    }

    get health() {
        return this._docker_healthy$.value === 'running'
    }

    async get_version() {
        return this._axios.get<DockerApi.VersionInformation>('/version').then(get_data).catch(if_catch('get version'))
    }

    async get_image_information(image_tag: string, headers: Record<string, string | undefined>) {
        return this._axios.get<DockerApi.DistributionDetail>(`${this.base_url}/distribution/${image_tag}/json`, {
            headers,
            validateStatus: null
        }).then(get_data).catch(if_catch('get image information'))
    }

    monitor_events(params?: { since?: string, until?: string, filters?: DockerApi.EventFilter }) {
        const controller = new AbortController
        return of(null).pipe(
            switchMap(() => this._axios.get(`${this.base_url}/events`, { responseType: 'stream', params })),
            switchMap(res => {
                const rl = readline.createInterface({ input: res!.data })
                return merge(
                    fromEvent<DockerApi.EventDetail>(rl, 'line', line => JSON.parse(line)),
                    fromEvent(rl, 'error').pipe(switchMap(err => {
                        throw err
                    })),
                ).pipe(
                    takeUntil(fromEvent(rl, 'close')),
                    finalize(() => rl.close()),
                )
            }),
            finalize(() => controller.abort()),
        )
    }

    async create_image(signal: AbortSignal, params: { fromImage: string, tag: string }, headers: Record<string, string | undefined>) {
        return this._axios.post('/images/create', null, { params, headers, responseType: 'stream', signal }).catch(err => {
            if (err instanceof axios.CanceledError) {
                logger.info('pulling image aborted')
                return null
            }
            logger.debug('Error occurred when create image: %s %d %O', err.message, err.response?.status, err.response?.data)
            throw err
        })
    }

    async inspect_image(name: string): Promise<DockerApi.ImageDetail | { message: string, Id: undefined }> {
        return this._axios.get<DockerApi.ImageDetail>(`/images/${name}/json`, {
            validateStatus: status => status < 400 || status === 404
        }).then(get_data).catch(if_catch('inspect image'))
    }

    async list_images(params?: { all?: boolean, filters?: DockerApi.ImageFilter, 'shared-size'?: boolean, digests?: boolean }) {
        const new_params: any = { all: params?.all, 'shared-size': params?.['shared-size'], digests: params?.digests }
        if (params?.filters) {
            new_params.filters = JSON.stringify(params.filters)
        }
        return this._axios.get<DockerApi.ImageOverview[]>(`/images/json`, { params: new_params }).then(get_data).catch(if_catch('list images'))
    }

    async remove_image(name_or_id: string, force?: boolean, noprune?: boolean) {
        const params = { force: force ?? undefined, noprune: noprune ?? undefined }
        return this._axios.delete<{ Untagged: string, Deleted: string }[]>(`/images/${name_or_id}`, { params }).then(get_data).catch(if_catch('remove image'))
    }

    async list_containers(params?: { all?: boolean, limit?: number, size?: boolean, filters?: DockerApi.ContainerFilter }) {
        const new_params: any = { all: params?.all, limit: params?.limit, size: params?.size }
        if (params?.filters) {
            new_params.filters = JSON.stringify(params.filters)
        }
        return this._axios.get<DockerApi.ContainerOverview[]>(`/containers/json`, { params: new_params }).then(get_data).catch(if_catch('list containers'))
    }

    async create_container({ name, platform, params }: { name: string, platform?: string, params: DockerApi.ContainerCreateParameters }) {
        const query: any = { name }
        if (platform) {
            query.platform = platform
        }
        return this._axios.post<{ Id: string, Warnings: string[] }>(`/containers/create`, params, { params: query }).then(get_data).catch(if_catch('create container'))
    }

    async inspect_container(id: string): Promise<DockerApi.ContainerDetail | { message: string, Id: undefined }> {
        return this._axios.get<DockerApi.ContainerDetail>(`/containers/${id}/json`, {
            validateStatus: status => status < 400 || status === 404
        }).then(get_data).catch(if_catch('inspect container'))
    }

    async restart_container(id: string, params?: { signal?: string, t?: number }) {
        return this._axios.post<null>(`/containers/${id}/restart`, {}, { params, }).then(get_data).catch(if_catch('restart container'))
    }

    async start_container(id: string, params?: { detachKeys?: string }) {
        return this._axios.post<null>(`/containers/${id}/start`, {}, { params, }).then(get_data).catch(if_catch('start container'))
    }

    async stop_container(id: string, params?: { signal?: string, t?: number }) {
        return this._axios.post<null>(`/containers/${id}/stop`, {}, { params, }).then(get_data).catch(if_catch('stop container'))
    }

    async delete_container(id: string, force?: boolean) {
        return this._axios.delete<null>(`/containers/${id}`, { params: { force: force ? 'true' : 'false' } }).then(get_data).catch(if_catch('delete container'))
    }

    async get_information_about_files(id: string, target: string): Promise<DockerApi.ContainerFileStat | null> {
        const res = await this._axios.head(`/containers/${id}/archive`, { params: { path: target } })
            .catch(if_catch('get information about files'))
        const raw_stat = res.headers['x-docker-container-path-stat']
        if (!raw_stat) {
            return null
        }
        const stat: DockerApi.ContainerFileStat = JSON.parse(Buffer.from(raw_stat, 'base64').toString())
        stat.type = stat.mode >= 512 ? 'dir' : 'file'
        return stat
    }

    async copy_from_container(id: string, src_path: string, dest_path: string): Promise<void> {
        const src_description = await this.get_information_about_files(id, src_path)
        if (!src_description) {
            throw new Error('source files not exists')
        }
        const stream = await this._axios.get(`/containers/${id}/archive`, {
            params: { path: src_path },
            responseType: 'stream',
        }).then(res => res.data).catch(if_catch('get archive to container'))
        const dest_stats = await this.check_file_exists(dest_path)
        if (!dest_stats) {
            await fs.mkdir(dest_path, { recursive: true })
        } else if (!dest_stats.isDirectory()) {
            throw new Error('destination is not a directory')
        }
        stream.pipe(tar.x({ cwd: dest_path }))
    }

    async copy_to_container(id: string, src_path: string, dest_path: string, options?: { noOverwriteDirNonDir?: boolean, copyUIDGID?: boolean }) {
        const src_stats = await this.check_file_exists(src_path)
        if (!src_stats) {
            throw new Error('source not exists')
        }
        const params = { path: dest_path, ...options }
        const stream = new PassThrough()
        const cwd = src_stats.isFile() ? path.dirname(src_path) : src_path
        const target_path = src_stats.isFile() ? path.basename(src_path) : '.'
        const pack = tar.c({ gzip: false, cwd: cwd }, [target_path]).pipe(stream)
        const chunks: Buffer[] = []
        pack.on('data', (chunk) => chunks.push(chunk))
        await finished(pack) // 等待流完成
        const content = Buffer.concat(chunks)
        return this._axios.put(`/containers/${id}/archive`, content, {
            params,
            headers: { 'Content-Type': 'application/x-tar' },
        }).then(get_data).catch(if_catch('put archive to container'))
    }

    // exec related

    async create_exec(id: string, params: DockerApi.ExecCreateParameters) {
        return this._axios.post<{ Id: string, Warning: string }>(`/containers/${id}/exec`, params, {}).then(get_data).catch(if_catch('create exec'))
    }

    async start_exec(id: string): Promise<net.Socket> {
        return new Promise<net.Socket>((resolve, reject) => {
            const start_exec_req = http.request(`${this.base_url}/exec/${id}/start`, {
                method: 'POST',
                headers: { 'Connection': 'Upgrade', 'Upgrade': 'tcp', 'Content-Type': 'application/json' },
                socketPath: '/var/run/docker.sock',
            }, res => res.statusCode !== 101 ? reject(new Error('start exec: status code -> ' + res.statusCode)) : null)

            start_exec_req.once('upgrade', (_res, socket, _head) => resolve(socket))
            start_exec_req.flushHeaders()
            start_exec_req.write(JSON.stringify({ Tty: true, ConsoleSize: [120, 80] }))
            start_exec_req.end()
        })
    }

    async resize_exec(id: string, params: DockerApi.ExecResizeParameters) {
        return this._axios.post<{ Id: string, Warning: string }>(`/exec/${id}/resize`, {}, { params }).then(get_data).catch(if_catch('resize exec'))
    }

    async inspect_exec(id: string) {
        return this._axios.get<DockerApi.ExecDetail>(`/exec/${id}/json`).then(get_data).catch(if_catch('inspect exec'))
    }

    // network related

    async create_network(params: DockerApi.NetworkCreateParameters) {
        return this._axios.post<{ Id: string, Warning: string }>(`/networks/create`, params, {}).then(get_data).catch(if_catch('create network'))
    }

    async list_networks(filters?: DockerApi.NetworkFilter) {
        const params = { filters: JSON.stringify(filters ?? {}) }
        return this._axios.get<DockerApi.NetworkDetail[]>(`/networks`, { params }).then(get_data).catch(if_catch('list networks'))
    }

    async inspect_network(id: string, options?: { verbose?: boolean, scope?: string }) {
        const params: any = {}
        params.verbose = options?.verbose ?? undefined
        params.scope = options?.scope ?? undefined
        return this._axios.get<DockerApi.NetworkDetail | { message: string, Id: undefined }>(`/networks/${id}`, {
            params,
            validateStatus: status => status < 400 || status === 404
        }).then(get_data).catch(if_catch('inspect network'))
    }

    async connect_network(name_or_id: string, options?: { Container?: string, EndpointConfig?: DockerApi.NetworkEndpointConfig }) {
        return this._axios.post<null>(`/networks/${name_or_id}/connect`, options ?? {}, {}).then(get_data).catch(if_catch('connect network'))
    }

    async disconnect_network(name_or_id: string, options?: { Container?: string, Force?: boolean }) {
        return this._axios.post<null>(`/networks/${name_or_id}/disconnect`, options ?? {}, {}).then(get_data).catch(if_catch('disconnect network'))
    }

    async prune_networks(filters?: { until?: string | number, label?: string[] }) {
        const params = filters ? { filters: JSON.stringify(filters ?? {}) } : undefined
        return this._axios.post<{ NetworksDeleted: string[] }>(`/networks/prune`, {}, { params }).then(get_data).catch(if_catch('prune networks'))
    }

    async remove_network(name_or_id: string): Promise<null> {
        return this._axios.delete<null>(`/networks/${name_or_id}`, {}).then(get_data).catch(if_catch('remove network'))
    }

    // volume related

    async create_volume(params: DockerApi.VolumeCreateParameters) {
        return this._axios.post<DockerApi.VolumeDetail>(`/volumes/create`, params, {}).then(get_data).catch(if_catch('create volume'))
    }

    async list_volumes(filters?: DockerApi.VolumeFilter) {
        const params = { filters: JSON.stringify(filters ?? {}) }
        return this._axios.get<{ Volumes: DockerApi.VolumeDetail[], Warnings: string[] }>(`/volumes`, { params }).then(get_data).catch(if_catch('list volumes'))
    }

    async inspect_volume(id: string) {
        return this._axios.get<DockerApi.VolumeDetail>(`/volumes/${id}`, {
            validateStatus: status => status < 400 || status === 404
        }).then(get_data).catch(if_catch('inspect volume'))
    }

    async remove_volume(name_or_id: string, force?: boolean): Promise<null> {
        const params = force ? { force: 'true' } : undefined
        return this._axios.delete<null>(`/volumes/${name_or_id}`, { params }).then(get_data).catch(if_catch('remove volume'))
    }

    async prune_volumes(filters?: { label?: string[] }) {
        const params = filters ? { filters: JSON.stringify(filters ?? {}) } : undefined
        return this._axios.post<{ VolumesDeleted: string[], SpaceReclaimed: number }>(`/volumes/prune`, {}, { params }).then(get_data).catch(if_catch('prune volumes'))
    }

    private async check_file_exists(target: string): Promise<Stats | null> {
        try {
            return await fs.stat(target)
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                return null
            } else {
                throw err
            }
        }
    }
}
