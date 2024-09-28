import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { MatButton, MatIconButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { ActivatedRoute } from '@angular/router'
import { DockerApi, NdcResponse } from '@docker-console/common'
import type * as monaco from 'monaco-editor'
import { filter, Subject, switchMap, tap, throttleTime } from 'rxjs'
import * as yaml from 'yaml'
import { MonacoEditorComponent } from '../../monaco/monaco-editor.component'
import { PopupService } from '../../popup/popup.service'

@Component({
    selector: 'ndc-network-inspection',
    imports: [
        MatDivider,
        MatIcon,
        MatIconButton,
        MonacoEditorComponent,
        FormsModule,
        MatButton
    ],
    templateUrl: './network-inspection.component.html',
    styleUrl: './network-inspection.component.scss'
})
export class NetworkInspectionComponent {

    create_network$ = new Subject()
    inspect_network$ = new Subject<string>()

    id = ''
    network_config = ''
    inspect_result?: DockerApi.NetworkDetail
    error_message = ''

    options: monaco.editor.IStandaloneEditorConstructionOptions = { language: 'yaml', }

    constructor(
        private _location: Location,
        private popup: PopupService,
        private route: ActivatedRoute,
        private _http: HttpClient,
    ) {
        this.create_network$.pipe(
            throttleTime(1000),
            switchMap(() => this.popup.warning({
                title: 'Create network base on current configuration?',
                messages: [],
            })),
            filter(data => !!data),
            switchMap(() => this._http.post('/ndc_api/docker/create_network', { params: yaml.parse(this.network_config) })),
            tap(() => this._location.back()),
            takeUntilDestroyed(),
        ).subscribe()
        this.inspect_network$.pipe(
            switchMap(id => this._http.post<NdcResponse<DockerApi.NetworkDetail>>('/ndc_api/docker/inspect_network', { id })),
            // map(res => this.inspect_result = res.data),
            tap(res => {
                if (res.status === 'success') {
                    this.inspect_result = res.data
                    this.network_config = JSON.stringify(res.data, null, 4)
                    this.error_message = ''
                } else {
                    this.error_message = res.message
                }
            }),
            takeUntilDestroyed(),
        ).subscribe()
        this.route.params.pipe(
            tap(params => {
                if (params['id'] !== 'create') {
                    this.id = params['id']
                    this.inspect_network$.next(this.id)
                    this.options = { ...this.options, readOnly: true }
                } else {
                    this.id = ''
                    this.network_config = ''
                    this.inspect_result = undefined
                    this.options = { ...this.options, readOnly: false }
                }
            }),
            takeUntilDestroyed(),
        ).subscribe()
    }

    go_back() {
        this._location.back()
    }
}
