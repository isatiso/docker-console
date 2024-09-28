import { HttpClient } from '@angular/common/http'
import { Injectable, TemplateRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { PullImageProgress } from '@docker-console/common'
import { filter, of, retry, Subject, switchMap, tap, throttleTime } from 'rxjs'
import { webSocket } from 'rxjs/webSocket'
import { PopupService } from '../popup/popup.service'

@Injectable({
    providedIn: 'root'
})
export class DockerService {

    logs_template?: TemplateRef<any>

    restart_container$ = new Subject<{ id: string }>()
    stop_container$ = new Subject<{ id: string }>()
    start_container$ = new Subject<{ id: string }>()
    delete_container$ = new Subject<{ id: string }>()

    layers: {
        id: string
        status: string
        current: number
        total: number
        progress_bar: string
    }[] = []
    progress?: PullImageProgress

    _raw_queue: PullImageProgress[] = []
    _raw_history: PullImageProgress[] = []
    queue: PullImageProgress[] = []
    queueing = 0

    constructor(
        private _http: HttpClient,
        private popup: PopupService,
    ) {
        of(null).pipe(
            switchMap(() => webSocket<
                | { type: 'progress', data: PullImageProgress }
                | { type: 'queue', data: { queue: PullImageProgress[], current: PullImageProgress | undefined, history: PullImageProgress[] } }
            >(`ws://${location.host}/ndc_api/docker/pull_progress`)),
            tap(({ type, data }) => {
                if (type === 'progress') {
                    this.progress = data
                    this.layers = data?.layers.map(id => data.layer_status[id]) ?? []
                } else if (type === 'queue') {
                    this.queueing = data.queue.length
                    this._raw_queue = data.queue.reverse()
                    this._raw_history = data.history.reverse()
                }
            }),
            tap(() => {
                if (this.progress) {
                    this.queue = [...this._raw_queue, this.progress, ...this._raw_history]
                } else {
                    this.queue = [...this._raw_queue, ...this._raw_history]
                }
            }),
            retry({ delay: 1000 }),
            takeUntilDestroyed(),
        ).subscribe()
        this.restart_container$.pipe(
            throttleTime(1000),
            switchMap(({ id }) => this._http.post<{ data: any[] }>('/ndc_api/docker/restart_container', { id })),
            tap(res => console.log(res)),
            takeUntilDestroyed(),
        ).subscribe()
        this.start_container$.pipe(
            throttleTime(1000),
            switchMap(({ id }) => this._http.post<{ data: any[] }>('/ndc_api/docker/start_container', { id })),
            tap(res => console.log(res)),
            takeUntilDestroyed(),
        ).subscribe()
        this.stop_container$.pipe(
            throttleTime(1000),
            switchMap(({ id }) => this._http.post<{ data: any[] }>('/ndc_api/docker/stop_container', { id })),
            tap(res => console.log(res)),
            takeUntilDestroyed(),
        ).subscribe()
        this.delete_container$.pipe(
            throttleTime(1000),
            switchMap(({ id }) => this.popup.warning({
                title: 'Delete Container Warning',
                messages: [
                    'Container ID:',
                    `    ${id}`,
                    '',
                    'Are you sure you want to delete this container?',
                ],
                pass: { id }
            })),
            filter(data => data),
            switchMap(({ id }) => this._http.post<{ data: any[] }>('/ndc_api/docker/delete_container', { id })),
            tap(res => console.log(res)),
            takeUntilDestroyed(),
        ).subscribe()
    }

    get badge_count() {
        return this.progress ? this.queueing + 1 : this.queueing
    }
}
