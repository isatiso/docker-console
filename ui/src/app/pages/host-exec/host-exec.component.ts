import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatIconButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { ActivatedRoute } from '@angular/router'
import { filterOutError } from '@docker-console/common'
import { FitAddon } from '@xterm/addon-fit'
import { ITerminalOptions, Terminal } from '@xterm/xterm'
import { BehaviorSubject, debounceTime, filter, finalize, find, merge, of, Subject, switchMap, take, takeUntil, tap } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import dark_theme from '../../iterm/material_dark_theme'
import light_theme from '../../iterm/material_light_theme'

@Component({
    selector: 'ndc-host-exec',
    imports: [
        MatDivider,
        MatIcon,
        MatIconButton,
    ],
    templateUrl: './host-exec.component.html',
    styleUrl: './host-exec.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class HostExecComponent implements OnDestroy, AfterViewInit {

    @ViewChild('terminal') terminal_div?: ElementRef

    name = ''
    exec_id = ''
    program = ''

    private prefer_dark$ = new BehaviorSubject(false)
    private start$ = new Subject<void>()
    private view_init$ = new BehaviorSubject(false)
    private resize$ = new Subject<{ cols: number, rows: number }>()
    private _term?: Terminal
    private _fitAddon?: FitAddon

    private _resize_observer?: ResizeObserver
    private _ws?: WebSocketSubject<any>
    private _destroyed$ = new Subject<void>()

    constructor(
        private _location: Location,
        private _route: ActivatedRoute,
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
            switchMap(({ cols, rows }) => this._http.post('/ndc_api/pty/resize', { id: this.exec_id, cols, rows })),
            takeUntilDestroyed(),
        ).subscribe()
        this.start$.pipe(
            switchMap(() => this.view_init$.pipe(find(Boolean))),
            switchMap(() => of(null).pipe(
                tap(() => this.create_terminal()),
                switchMap(() => this.start_exec()),
                filterOutError(err => console.log(err)),
                finalize(() => {
                    this._resize_observer?.unobserve(this.terminal_div!.nativeElement)
                    this._term?.dispose()
                })
            )),
            takeUntilDestroyed(),
        ).subscribe()
        this._route.url.pipe(
            tap(url => this.program = url[0].path.replace('host-', '')),
            tap(() => this.start$.next()),
            takeUntilDestroyed(),
        ).subscribe()
    }

    start_exec() {
        this.exec_id = Math.random().toString(36).slice(2, 16) + Math.random().toString(36).slice(2, 16)
        const close$ = new Subject()
        close$.pipe(
            take(1),
            takeUntil(this._destroyed$),
            // tap(() => this.go_back()),
        ).subscribe()
        const params = `id=${this.exec_id}&rows=${this._term!.rows}&cols=${this._term!.cols}&type=${this.program}`
        this._ws = webSocket<any>({
            url: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ndc_api/pty/create?${params}`,
            deserializer: e => e.data,
            serializer: e => e,
            closeObserver: close$,
        })
        return this._ws.pipe(
            tap(data => this._term!.write(data.toString())),
            takeUntil(merge(this.start$, this._destroyed$)),
        )
    }

    create_terminal() {
        this._term?.dispose()
        this._resize_observer?.unobserve(this.terminal_div!.nativeElement)
        const options = {
            fontSize: 14,
            fontFamily: 'Source Code Pro, monospace',
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
    }

    ngOnDestroy() {
        this._destroyed$.next()

    }

    go_back() {
        this._location.back()
    }
}
