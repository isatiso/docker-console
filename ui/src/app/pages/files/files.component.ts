import { SelectionModel } from '@angular/cdk/collections'
import { DatePipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatIconButton, MatMiniFabButton } from '@angular/material/button'
import { MatCheckbox } from '@angular/material/checkbox'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatTooltip } from '@angular/material/tooltip'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { filter, map, Subject, switchMap, tap } from 'rxjs'
import { BytesPipe } from '../../pipes/bytes.pipe'
import { PopupService } from '../../popup/popup.service'

@Component({
    selector: 'ndc-files',
    imports: [
        MatDivider,
        DatePipe,
        RouterLink,
        MatIcon,
        MatMiniFabButton,
        MatTooltip,
        MatTableModule,
        MatIconButton,
        BytesPipe,
        MatCheckbox,
    ],
    templateUrl: './files.component.html',
    styleUrl: './files.component.scss'
})
export class FilesComponent {

    current_dir = '/'
    dir_arr: { name: string, path: string }[] = []
    files: { type: 'file' | 'directory' | 'other', name: string }[] = []

    selection = new SelectionModel<{ type: 'file' | 'directory' | 'other', name: string }>(true, [])

    list_files$ = new Subject<string>()
    rename_file$ = new Subject<string>()
    remove_file$ = new Subject<string>()
    remove_dir$ = new Subject<string>()
    create_file$ = new Subject<void>()
    create_dir$ = new Subject<void>()
    download$ = new Subject<string | void>()

    constructor(
        private _http: HttpClient,
        private _router: Router,
        private _route: ActivatedRoute,
        private popup: PopupService,
    ) {
        this.download$.pipe(
            tap(() => console.log(this.selection.selected)),
            takeUntilDestroyed(),
        ).subscribe()
        this.list_files$.pipe(
            switchMap(dir => this._http.post<{ data: { files: { type: 'file' | 'directory' | 'other', name: string }[] } }>('/ndc_api/file/ls', { dir })),
            map(res => res.data.files),
            map(files => files.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))),
            tap(files => this.files = files),
            tap(files => console.log(files)),
            takeUntilDestroyed(),
        ).subscribe()
        this.remove_file$.pipe(
            switchMap(filename => this.popup.warning({
                title: `Remove File`,
                messages: [
                    `Remove File: ${filename}`,
                    'Are you sure?'
                ],
                pass: filename
            })),
            filter(value => !!value),
            switchMap(filename => this._http.post<{ data: null }>('/ndc_api/file/rm', { dir: this.current_dir, filename })),
            tap(() => this.list_files$.next(this.current_dir)),
            takeUntilDestroyed(),
        ).subscribe()
        this.remove_dir$.pipe(
            switchMap(dirname => this.popup.warning({
                title: `Remove Directory`,
                messages: [
                    `Remove Directory: ${dirname}`,
                    'Are you sure?',
                ],
                pass: dirname
            })),
            filter(value => !!value),
            switchMap(dirname => this._http.post<{ data: null }>('/ndc_api/file/rmdir', { dir: this.current_dir, dirname })),
            tap(() => this.list_files$.next(this.current_dir)),
            takeUntilDestroyed(),
        ).subscribe()
        this.rename_file$.pipe(
            switchMap(filename => this.popup.input({ title: `Rename File: ${filename}`, label: 'Filename', value: filename }).pipe(
                filter(value => !!value),
                switchMap(value => this._http.post<{ data: null }>('/ndc_api/file/rename', {
                    dir: this.current_dir,
                    filename: filename,
                    new_name: value
                })),
            )),
            tap(() => this.list_files$.next(this.current_dir)),
            takeUntilDestroyed(),
        ).subscribe()
        this.create_file$.pipe(
            switchMap(() => this.popup.input({ title: `Create File`, label: 'Filename', value: '' }).pipe(
                filter(value => !!value),
                switchMap(value => this._http.post<{ data: null }>('/ndc_api/file/write', {
                    dir: this.current_dir,
                    filename: value,
                    content: ''
                })),
            )),
            tap(() => this.list_files$.next(this.current_dir)),
            takeUntilDestroyed(),
        ).subscribe()
        this.create_dir$.pipe(
            switchMap(() => this.popup.input({ title: `Create Directory`, label: 'Dirname', value: '' }).pipe(
                filter(value => !!value),
                switchMap(value => this._http.post<{ data: null }>('/ndc_api/file/mkdir', {
                    dir: this.current_dir,
                    name: value
                })),
            )),
            tap(() => this.list_files$.next(this.current_dir)),
            takeUntilDestroyed(),
        ).subscribe()
        this._route.params.pipe(
            tap(params => {
                this.current_dir = params['dir'] ? atob(params['dir']) : '/'
                const dir_arr = this.current_dir.split('/').filter(Boolean)
                this.dir_arr = dir_arr.map((_, i) => ({ name: dir_arr[i], path: '/' + dir_arr.slice(0, i + 1).join('/') }))
            }),
            tap(() => this.list_files$.next(this.current_dir)),
            takeUntilDestroyed(),
        ).subscribe()
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length
        const numRows = this.files.length
        return numSelected === numRows
    }

    toggleAllRows() {
        if (this.isAllSelected()) {
            this.selection.clear()
            return
        }

        this.selection.select(...this.files)
    }

    navigate(name: string) {
        this._router.navigate(['/files', btoa(name)]).then()
    }

    go_edit(name: string) {
        this._router.navigate(['/files-edit', btoa(name)]).then()
    }
}
