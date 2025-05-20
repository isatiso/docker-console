import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatIconButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { ActivatedRoute } from '@angular/router'
import { DockerApi, NdcResponse } from '@docker-console/common'
import { FitAddon } from '@xterm/addon-fit'
import { ITerminalOptions, Terminal } from '@xterm/xterm'
import { BehaviorSubject, debounceTime, filter, map, of, Subject, switchMap, take, tap } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import dark_theme from '../../iterm/material_dark_theme'
import light_theme from '../../iterm/material_light_theme'

@Component({
    selector: 'ndc-container-exec',
    imports: [
        MatDivider,
        MatIcon,
        MatIconButton,
    ],
    templateUrl: './container-exec.component.html',
    styleUrl: './container-exec.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class ContainerExecComponent implements OnDestroy, AfterViewInit {

    @ViewChild('terminal') terminal_div?: ElementRef
    container_id = ''
    name = ''
    exec_id = ''

    private prefer_dark$ = new BehaviorSubject(false)
    private inspect_container$ = new Subject<string>()
    private view_init$ = new BehaviorSubject(false)
    private start$ = new Subject<void>()
    private resize$ = new Subject<{ cols: number, rows: number }>()
    private _term?: Terminal
    private _fitAddon?: FitAddon

    private _resize_observer?: ResizeObserver
    private _ws?: WebSocketSubject<any>

    constructor(
        private _location: Location,
        private route: ActivatedRoute,
        private _http: HttpClient,
    ) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
        this.prefer_dark$.next(prefersDark.matches)
        prefersDark.addEventListener('change', e => this.prefer_dark$.next(e.matches))
        this.prefer_dark$.pipe(
            filter(() => !!this._term),
            tap(prefer_dark => this._term!.options.theme = prefer_dark ? dark_theme : light_theme),
            takeUntilDestroyed(),
        ).subscribe()
        this.resize$.pipe(
            debounceTime(200),
            filter(() => !!this.exec_id),
            switchMap(({ cols, rows }) => this._http.post('/ndc_api/docker/resize_exec', { id: this.exec_id, w: cols, h: rows })),
            takeUntilDestroyed(),
        ).subscribe()
        this.start$.pipe(
            filter(() => this.view_init$.value),
            tap(() => this.create_terminal()),
            switchMap(() => this.create_exec(this.container_id)),
            map(({ data }) => data.id),
            switchMap(id => of(null).pipe(
                tap(() => this.exec_id = id),
                switchMap(() => this.inspect_exec(id)),
                tap(data => console.log(`exec ${id}:`, data)),
                tap(() => this._term && this.resize$.next({ rows: this._term.rows, cols: this._term.cols })),
                switchMap(() => this.start_exec(id)),
            )),
            takeUntilDestroyed(),
        ).subscribe()
        this.inspect_container$.pipe(
            switchMap(id => this._http.post<NdcResponse<DockerApi.ContainerDetail>>('/ndc_api/docker/inspect_container', { id })),
            tap(res => {
                if (res.status === 'success') {
                    this.name = res.data.Name
                }
            }),
            takeUntilDestroyed(),
        ).subscribe()
        this.route.params.pipe(
            map(params => this.container_id = params['id']),
            tap(id => this.inspect_container$.next(id)),
            tap(() => this.start$.next()),
            takeUntilDestroyed(),
        ).subscribe()
    }

    create_exec(id: string) {
        return this._http.post<{ data: { id: string } }>(`/ndc_api/docker/create_exec_as_bash`, { id })
    }

    inspect_exec(id: string) {
        return this._http.post(`/ndc_api/docker/inspect_exec`, { id })
    }

    start_exec(id: string) {
        const close$ = new Subject()
        close$.pipe(
            take(1),
            tap(() => this.go_back()),
        ).subscribe()
        this._ws = webSocket<any>({
            url: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ndc_api/docker/start_exec?id=${id}`,
            deserializer: e => e.data,
            serializer: e => e,
            closeObserver: close$,
        })
        return this._ws.pipe(
            tap(data => this._term!.write(data.toString()))
        )
    }

    create_terminal() {
        this._term?.dispose()
        this._resize_observer?.unobserve(this.terminal_div!.nativeElement)
        const options = {
            fontSize: 13,
            fontFamily: 'Menlo, monospace',
            theme: this.prefer_dark$.value ? dark_theme : light_theme
        } satisfies ITerminalOptions
        this._term = new Terminal(options)
        this._fitAddon = new FitAddon()
        this._term.loadAddon(this._fitAddon)
        this._term.open(this.terminal_div!.nativeElement)
        this._term.onResize(data => this.resize$.next(data))
        this._term.onSelectionChange(() => {
            const selection = this._term?.getSelection()
            if (selection) {
                navigator.clipboard.writeText(selection).then()
            }
        })
        this._term.onData(data => this._ws?.next(data))
        this._resize_observer = new ResizeObserver(() => this._fitAddon?.fit())
        this._resize_observer.observe(this.terminal_div!.nativeElement)
    }

    ngAfterViewInit() {
        this.view_init$.next(true)
        this.start$.next()
    }

    ngOnDestroy() {
        this._resize_observer?.unobserve(this.terminal_div!.nativeElement)
        this._term?.dispose()
    }

    go_back() {
        this._location.back()
    }

    close_term() {
        this._ws?.next(String.fromCharCode(10, 11))
    }
}
