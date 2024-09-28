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
import { Subject, switchMap, tap } from 'rxjs'
import { MonacoEditorComponent } from '../../monaco/monaco-editor.component'

@Component({
    selector: 'ndc-image-inspection',
    imports: [
        MatDivider,
        MatIcon,
        MatIconButton,
        MonacoEditorComponent,
        FormsModule,
    ],
    templateUrl: './image-inspection.component.html',
    styleUrl: './image-inspection.component.scss'
})
export class ImageInspectionComponent {

    inspect_image$ = new Subject<string>()

    id = ''
    volume_config = ''
    inspect_result?: DockerApi.ImageDetail
    error_message?: string

    options: monaco.editor.IStandaloneEditorConstructionOptions = { language: 'yaml' }

    constructor(
        private _location: Location,
        private _route: ActivatedRoute,
        private _http: HttpClient,
    ) {
        this.inspect_image$.pipe(
            switchMap(name => this._http.post<NdcResponse<DockerApi.ImageDetail>>('/ndc_api/docker/inspect_image', { name })),
            tap(res => {
                if (res.status === 'success') {
                    this.inspect_result = res.data
                    this.volume_config = JSON.stringify(res.data, null, 4)
                    this.error_message = undefined
                } else {
                    this.error_message = res.message
                }
            }),
            takeUntilDestroyed(),
        ).subscribe()
        this._route.params.pipe(
            tap(params => {
                this.id = params['id']
                this.inspect_image$.next(this.id)
                this.options = { ...this.options, readOnly: true }
            }),
            takeUntilDestroyed(),
        ).subscribe()
    }

    go_back() {
        this._location.back()
    }
}
