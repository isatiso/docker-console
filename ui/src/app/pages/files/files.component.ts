import { AsyncPipe, NgTemplateOutlet } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, ViewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatDivider } from '@angular/material/divider'
import { MatTableModule } from '@angular/material/table'
import { ActivatedRoute } from '@angular/router'
import type { Stats } from 'node:fs'
import { Subject, switchMap, tap } from 'rxjs'
import { BreadcrumbsComponent } from '../../layout/breadcrumbs/breadcrumbs.component'
import { BreadcrumbsService } from '../../layout/breadcrumbs/breadcrumbs.service'
import { FileEditorComponent } from './file-editor/file-editor.component'
import { FileListComponent } from './file-list/file-list.component'

@Component({
    selector: 'ndc-files',
    imports: [
        MatDivider,
        MatTableModule,
        BreadcrumbsComponent,
        FileListComponent,
        FileEditorComponent,
        AsyncPipe,
        NgTemplateOutlet,

    ],
    templateUrl: './files.component.html',
    styleUrl: './files.component.scss'
})
export class FilesComponent {
    @ViewChild('child_component') child_component?: FileEditorComponent | FileListComponent
    get_file_stats$ = new Subject<void>()

    constructor(
        private _http: HttpClient,
        private _route: ActivatedRoute,
        public bread: BreadcrumbsService,
    ) {
        this.get_file_stats$.pipe(
            switchMap(() => this._http.get<{ data: { stats: Stats, type: 'directory' | 'file' } }>(`/ndc_api/file/lstat/${this.bread.current}`)),
            tap(res => console.log(res)),
            tap(res => this.bread.file_stats$.next(res.data)),
            takeUntilDestroyed(),
        ).subscribe()
        this._route.url.pipe(
            tap(url => this.bread.update(url)),
            tap(() => this.get_file_stats$.next()),
            takeUntilDestroyed(),
        ).subscribe()
    }
}
