import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { MatButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { ActivatedRoute, Router } from '@angular/router'
import type * as monaco from 'monaco-editor'
import { Subject, switchMap, tap } from 'rxjs'
import { BreadcrumbsComponent } from '../../layout/breadcrumbs/breadcrumbs.component'
import { BreadcrumbsService } from '../../layout/breadcrumbs/breadcrumbs.service'
import { MonacoEditorComponent } from '../../monaco/monaco-editor.component'
import { VersionService } from '../../services/version.service'

@Component({
    selector: 'ndc-file-editor',
    imports: [
        MatButton,
        MatDivider,
        MonacoEditorComponent,
        FormsModule,
        MatIcon,
        BreadcrumbsComponent
    ],
    templateUrl: './file-editor.component.html',
    styleUrl: './file-editor.component.scss'
})
export class FileEditorComponent implements OnInit, OnDestroy {

    @ViewChild('version_editor', { static: true }) _editor?: MonacoEditorComponent

    content = ''
    edited_content = ''
    get_file_content$ = new Subject<void>()
    options: monaco.editor.IStandaloneEditorConstructionOptions = { language: 'json' }
    downloading = false

    constructor(
        private _http: HttpClient,
        public versions: VersionService,
        public bread: BreadcrumbsService,
        private route: ActivatedRoute,
    ) {
        this.get_file_content$.pipe(
            tap(() => this.downloading = true),
            switchMap(() => this._http.get(`/ndc_api/file/content/${this.bread.current}`, { responseType: 'text' })),
            tap(res => this.edited_content = this.content = res),
            tap(() => this.downloading = false),
            takeUntilDestroyed(),
        ).subscribe()
        this.route.url.pipe(
            tap(url => this.bread.update(url)),
            tap(() => this.get_file_content$.next()),
            takeUntilDestroyed(),
        ).subscribe()
    }

    get content_changed() {
        return this.edited_content !== this.content
    }

    @HostListener('window:keydown', ['$event']) keyEvent(event: KeyboardEvent) {
        if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            event.stopPropagation()
            this.save()
        }
    }

    find() {
        this._editor?.trigger('version-detail', 'actions.find', undefined)
    }

    find_selection() {
        this._editor?.trigger('version-detail', 'actions.findWithSelection', undefined)
    }

    fold_all() {
        this._editor?.trigger('version-detail', 'editor.foldAll', undefined)
    }

    unfold_all() {
        this._editor?.trigger('version-detail', 'editor.unfoldAll', undefined)
    }

    fold() {
        this._editor?.trigger('version-detail', 'editor.foldRecursively', undefined)
    }

    unfold() {
        this._editor?.trigger('version-detail', 'editor.unfoldRecursively', undefined)
    }

    save() {
        this._http.post(`/ndc_api/file/write/${this.bread.current}`, this.edited_content).subscribe(() => {
            this.content = this.edited_content
        })
    }

    ngOnInit() {
        if (!this.versions.initialized$.value) {
            this.versions.fetch_version$.next()
        }
    }

    ngOnDestroy() {
        this.edited_content = ''
        this.content = ''
    }
}
