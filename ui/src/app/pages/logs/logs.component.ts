import { Location } from '@angular/common'
import { Component, ViewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { MatIconButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { MatSlideToggle } from '@angular/material/slide-toggle'
import { ActivatedRoute } from '@angular/router'
import type * as monaco from 'monaco-editor'
import { auditTime, filter, map, of, retry, Subject, switchMap, takeUntil, tap, throttleTime } from 'rxjs'
import { webSocket } from 'rxjs/webSocket'
import { MonacoEditorComponent } from '../../monaco/monaco-editor.component'

@Component({
    selector: 'ndc-logs',
    imports: [
        MatDivider,
        MatIconButton,
        MatIcon,
        MatSlideToggle,
        FormsModule,
        MonacoEditorComponent
    ],
    templateUrl: './logs.component.html',
    styleUrl: './logs.component.scss'
})
export class LogsComponent {

    @ViewChild('log_view') log_view_element?: MonacoEditorComponent

    auto_scroll = true
    name = ''
    logs = ''
    show_logs$ = new Subject<{ id: string }>()
    options: monaco.editor.IStandaloneEditorConstructionOptions = { language: 'shell', theme: 'vs-dark', lineNumbers: 'off' }

    constructor(
        private _location: Location,
        private route: ActivatedRoute,
    ) {
        this.show_logs$.pipe(
            throttleTime(500),
            switchMap(({ id }) => of(null).pipe(
                tap(() => this.logs = ''),
                switchMap(() => webSocket<string>({ url: this.get_ws_url(id), deserializer: msg => msg.data })),
                filter(msg => !!msg.trim()),
                tap(msg => {
                    this.logs += msg
                    const lines = this.log_view_element?.getLineCount() ?? 0
                    if (lines > 100000) {
                        this.log_view_element?.removeFirstLines(10000)
                    }
                }),
                auditTime(200),
                tap(() => this.auto_scroll && this.log_view_element?.scrollToBottom()),
                takeUntil(this.show_logs$),
            )),
            retry({ delay: 1000 }),
            takeUntilDestroyed(),
        ).subscribe()
        this.route.queryParams.pipe(
            tap(params => this.name = params['name']),
            takeUntilDestroyed(),
        ).subscribe()
        this.route.params.pipe(
            map(params => params['id']),
            tap(container_id => this.show_logs$.next({ id: container_id })),
            takeUntilDestroyed(),
        ).subscribe()
    }

    go_back() {
        this._location.back()
    }

    private get_ws_url(id: string) {
        return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ndc_api/docker/logs?id=${id}&tail=20000`
    }
}
