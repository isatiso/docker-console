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
import { ToolsService } from '../../services/tools.service'
import { VersionService } from '../../services/version.service'

@Component({
    selector: 'ndc-file-editor',
    imports: [
        MatButton,
        MatDivider,
        MonacoEditorComponent,
        FormsModule,
        RouterLink
    ],
    templateUrl: './file-editor.component.html',
    styleUrl: './file-editor.component.scss'
})
export class FileEditorComponent implements OnInit, OnDestroy {

    @ViewChild('version_editor', { static: true }) _editor?: MonacoEditorComponent

    @HostListener('window:keydown', ['$event']) keyEvent(event: KeyboardEvent) {
        if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            event.stopPropagation()
            this.save()
        }
    }

    dir_arr: { name: string, path: string }[] = []
    dir = ''
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
        private _tools: ToolsService,
        public versions: VersionService,
        private route: ActivatedRoute,
    ) {
        this.get_file_content$.pipe(
            switchMap(() => this._http.post<{ data: { content: string } }>('/ndc_api/file/read_text', { dir: this.dir, filename: this.filename })),
            tap(res => {
                this.content = res.data.content
                this.edited_content = this.content
                console.log(this.content)
            }),
            takeUntilDestroyed(),
        ).subscribe()
        this.route.params.pipe(
            tap(params => {
                const location = this._tools.base64_decode(params['location']).split('/').filter(Boolean)
                this.filename = location.slice(-1)[0]
                this.lang = this.filename.split('.').slice(-1)[0]
                this.dir = location.slice(0, -1).join('/') || '/'
                const dir_arr = location.slice(0, -1)
                this.dir_arr = dir_arr.map((_, i) => ({ name: dir_arr[i], path: '/' + dir_arr.slice(0, i + 1).join('/') }))
            }),
            filter(() => !!this.dir && !!this.filename),
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
        this._http.post('/ndc_api/file/write_text', {
            dir: this.dir,
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
        this.dir = ''
    }

    go_back() {
        this._location.back()
    }

    navigate(name: string) {
        this._router.navigate(['/files', this._tools.base64_encode(name)]).then()
    }
}
