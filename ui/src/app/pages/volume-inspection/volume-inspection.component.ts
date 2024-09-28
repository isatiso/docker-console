import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { MatIconButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { ActivatedRoute } from '@angular/router'
import { DockerApi } from '@docker-console/common'
import type * as monaco from 'monaco-editor'
import { map, Subject, switchMap, tap } from 'rxjs'
import { MonacoEditorComponent } from '../../monaco/monaco-editor.component'

@Component({
    selector: 'ndc-volume-inspection',
    imports: [
        MatDivider,
        MatIcon,
        MatIconButton,
        MonacoEditorComponent,
        FormsModule,
    ],
    templateUrl: './volume-inspection.component.html',
    styleUrl: './volume-inspection.component.scss'
})
export class VolumeInspectionComponent {

    inspect_volume$ = new Subject<string>()

    id = ''
    volume_config = ''
    inspect_result?: DockerApi.VolumeDetail

    options: monaco.editor.IStandaloneEditorConstructionOptions = { language: 'yaml' }

    constructor(
        private _location: Location,
        private route: ActivatedRoute,
        private _http: HttpClient,
    ) {
        this.inspect_volume$.pipe(
            switchMap(id => this._http.post<{ data: DockerApi.VolumeDetail }>('/ndc_api/docker/inspect_volume', { id })),
            map(res => this.inspect_result = res.data),
            tap(data => this.volume_config = JSON.stringify(data, null, 4)),
            takeUntilDestroyed(),
        ).subscribe()
        this.route.params.pipe(
            tap(params => {
                this.id = params['id']
                this.inspect_volume$.next(this.id)
                this.options = { ...this.options, readOnly: true }
            }),
            takeUntilDestroyed(),
        ).subscribe()
    }

    go_back() {
        this._location.back()
    }
}
