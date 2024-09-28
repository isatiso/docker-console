import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { MatIconButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { ActivatedRoute } from '@angular/router'
import { DockerApi, NdcResponse } from '@docker-console/common'
import type * as monaco from 'monaco-editor'
import { map, Subject, switchMap, tap } from 'rxjs'
import { MonacoEditorComponent } from '../../monaco/monaco-editor.component'

@Component({
    selector: 'ndc-container-inspection',
    imports: [
        MatDivider,
        MatIcon,
        MatIconButton,
        MonacoEditorComponent,
        FormsModule
    ],
    templateUrl: './container-inspection.component.html',
    styleUrl: './container-inspection.component.scss'
})
export class ContainerInspectionComponent {

    inspect_container$ = new Subject<string>()

    id = ''
    name = ''
    detail = ''
    inspect_result: any = {}
    error_message?: string

    options: monaco.editor.IStandaloneEditorConstructionOptions = { readOnly: true, language: 'yaml' }

    constructor(
        private _location: Location,
        private route: ActivatedRoute,
        private _http: HttpClient,
    ) {
        this.inspect_container$.pipe(
            switchMap(id => this._http.post<NdcResponse<DockerApi.ContainerDetail>>('/ndc_api/docker/inspect_container', { id })),
            tap(res => {
                if (res.status === 'success') {
                    this.inspect_result = res.data
                    this.name = res.data.Name
                    this.detail = JSON.stringify(res.data, null, 4)
                    this.error_message = undefined
                } else {
                    this.error_message = res.message
                }
            }),
            takeUntilDestroyed(),
        ).subscribe()
        this.route.params.pipe(
            map(params => this.id = params['id']),
            tap(id => this.inspect_container$.next(id)),
            takeUntilDestroyed(),
        ).subscribe()
    }

    go_back() {
        this._location.back()
    }
}
