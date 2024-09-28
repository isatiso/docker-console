import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { MatButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import type * as monaco from 'monaco-editor'
import { filter, Subject, switchMap, tap } from 'rxjs'
import { MonacoEditorComponent } from '../../monaco/monaco-editor.component'
import { VersionService } from '../../services/version.service'

@Component({
    selector: 'ndc-project-editor',
    imports: [
        FormsModule,
        MatDivider,
        MonacoEditorComponent,
        MatButton,
        RouterLink
    ],
    templateUrl: './project-editor.component.html',
    styleUrl: './project-editor.component.scss'
})
export class ProjectEditorComponent implements OnInit, OnDestroy {

    @ViewChild('version_editor', { static: true }) _editor?: MonacoEditorComponent

    @HostListener('window:keydown', ['$event']) keyEvent(event: KeyboardEvent) {
        if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            event.stopPropagation()
            this.save()
        }
    }

    filename = ''
    content = ''
    edited_content = ''

    get_file_content$ = new Subject<void>()

    lang = ''
    options: monaco.editor.IStandaloneEditorConstructionOptions = { language: 'json' }

    constructor(
        private _http: HttpClient,
        private _location: Location,
        private _router: Router,
        public versions: VersionService,
        private route: ActivatedRoute,
    ) {
        this.get_file_content$.pipe(
            switchMap(() => this._http.post<{ data: { content: string } }>('/ndc_api/file/read', { category: 'projects', dir: '/', filename: this.filename })),
            tap(res => this.content = res.data.content),
            tap(res => this.edited_content = this.content),
            tap(res => console.log(this.content)),
            takeUntilDestroyed(),
        ).subscribe()
        this.route.params.pipe(
            tap(params => {
                this.filename = atob(params['location'])
                this.lang = this.filename.split('.').slice(-1)[0]
            }),
            filter(() => !!this.filename),
            tap(() => this.get_file_content$.next()),
            takeUntilDestroyed(),
        ).subscribe()
    }

    get content_changed() {
        return this.edited_content !== this.content
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
        this._http.post('/ndc_api/file/write', {
            category: 'projects',
            dir: '/',
            filename: this.filename,
            content: this.edited_content
        }).subscribe(() => {
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
        this.filename = ''
    }

    go_back() {
        this._location.back()
    }

    navigate(name: string) {
        this._router.navigate(['/files', btoa(name)]).then()
    }
}
