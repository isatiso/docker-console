import { SelectionModel } from '@angular/cdk/collections'
import { DatePipe, PercentPipe } from '@angular/common'
import { HttpClient, HttpEventType } from '@angular/common/http'
import { Component, TemplateRef, ViewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { MatIconButton, MatMiniFabButton } from '@angular/material/button'
import { MatCheckbox } from '@angular/material/checkbox'
import { MatIcon } from '@angular/material/icon'
import { MatCell, MatCellDef, MatColumnDef, MatHeaderCell, MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef, MatTable, MatTableModule } from '@angular/material/table'
import { MatTooltip } from '@angular/material/tooltip'
import { FileDesc } from '@docker-console/common'
import JSZip from 'jszip'
import { filter, finalize, map, mergeMap, of, Subject, switchMap, tap, throttleTime } from 'rxjs'
import { BreadcrumbsService } from '../../../layout/breadcrumbs/breadcrumbs.service'
import { BytesPipe } from '../../../pipes/bytes.pipe'
import { PopupService } from '../../../popup/popup.service'
import { FileTypeService } from '../../../services/file-type.service'
import { FileWithPath, UploadZoneDirective } from '../upload-zone.directive'

@Component({
    selector: 'ndc-file-list',
    imports: [
        FormsModule,
        MatIcon,
        BytesPipe,
        DatePipe,
        MatCell,
        MatCellDef,
        MatCheckbox,
        MatColumnDef,
        MatHeaderCell,
        MatHeaderRow,
        MatHeaderRowDef,
        MatIconButton,
        MatRow,
        MatRowDef,
        MatTable,
        MatTooltip,
        PercentPipe,
        UploadZoneDirective,
        MatTableModule,
        MatMiniFabButton,
    ],
    templateUrl: './file-list.component.html',
    styleUrl: './file-list.component.scss'
})
export class FileListComponent {

    @ViewChild('operations') operations_template?: TemplateRef<any>

    upload_status: 'compressing' | 'uploading' | '' = ''
    compressing_percent = 0
    uploading_size = 0

    files: FileDesc[] = []
    selection = new SelectionModel<FileDesc>(true, [])

    list_files$ = new Subject<void>()
    rename_file$ = new Subject<string>()
    copy$ = new Subject<string>()
    remove_file$ = new Subject<string>()
    remove_dir$ = new Subject<string>()
    create_file$ = new Subject<void>()
    create_dir$ = new Subject<void>()
    download_dir$ = new Subject<string>()
    download_file$ = new Subject<string>()
    upload_files$ = new Subject<FileWithPath[]>()

    constructor(
        private _file_type: FileTypeService,
        private _http: HttpClient,
        private _popup: PopupService,
        public bread: BreadcrumbsService,
    ) {
        this.upload_files$.pipe(
            mergeMap(files => of(null).pipe(
                tap(() => this.upload_status = 'compressing'),
                switchMap(async () => {
                    const zip = new JSZip()
                    for (const file_with_path of files) {
                        zip.file(file_with_path.path, file_with_path.file)
                    }
                    return await zip.generateAsync({ type: 'blob' }, (metadata) => {
                        this.compressing_percent = metadata.percent / 100
                    })
                }),
                tap(zip_blob => this.uploading_size = zip_blob.size),
                tap(() => this.upload_status = 'uploading'),
                switchMap(zip_blob => {
                    const current_path = [...this.bread.segments.map(d => d.name)].join('/')
                    return this._http.post(`/ndc_api/file/upload/${current_path}`, zip_blob, {
                        headers: { 'Content-Type': 'application/zip' },
                        reportProgress: true,
                        observe: 'events'
                    })
                }),
                tap(evt => {
                    if (evt.type === HttpEventType.UploadProgress && evt.total) {
                        const pct = Math.round(100 * evt.loaded / evt.total)
                        console.log('upload progress', pct, '%')
                    } else if (evt.type === HttpEventType.Response) {
                        this.list_files$.next()
                        console.log('upload completed')
                    }
                }),
                finalize(() => this.upload_status = ''),
            )),
        ).subscribe()
        this.download_file$.pipe(
            throttleTime(800),
            switchMap(filename => of(null).pipe(
                tap(() => {
                    const filepath = [...this.bread.segments.map(d => d.name), filename].join('/')
                    const url = `/ndc_api/file/content/${filepath}`
                    const a = document.createElement('a')
                    a.href = url
                    a.download = filename
                    a.click()
                }),
            )),
            takeUntilDestroyed(),
        ).subscribe()
        this.download_dir$.pipe(
            throttleTime(800),
            switchMap(filename => of(null).pipe(
                tap(() => {
                    const filepath = [...this.bread.segments.map(d => d.name), filename].join('/')
                    const url = `/ndc_api/file/zip/${filepath}`
                    const a = document.createElement('a')
                    a.href = url
                    a.download = filename + '.zip'
                    a.click()
                }),
            )),
            takeUntilDestroyed(),
        ).subscribe()
        this.list_files$.pipe(
            throttleTime(300, undefined, { leading: true, trailing: true }),
            map(() => [...this.bread.segments.map(d => d.name)].join('/')),
            switchMap(dir => this._http.get<{ data: { files: FileDesc[] } }>(`/ndc_api/file/ls/${dir}`, {})),
            map(res => res.data.files),
            map(files => files.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))),
            tap(files => this.files = files),
            tap(files => console.log(files)),
            takeUntilDestroyed(),
        ).subscribe()
        this.remove_file$.pipe(
            switchMap(filename => this._popup.warning({
                title: `Remove File`,
                messages: [
                    `Remove File: ${filename}`,
                    'Are you sure?'
                ],
                pass: filename
            })),
            filter(value => !!value),
            switchMap(filename => this._http.post<{ data: null }>(`/ndc_api/file/rm/${this.bread.file(filename)}`, '')),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.remove_dir$.pipe(
            switchMap(dirname => this._popup.warning({
                title: `Remove Directory`,
                messages: [
                    `Remove Directory: ${dirname}`,
                    'Are you sure?',
                ],
                pass: dirname
            })),
            filter(value => !!value),
            switchMap(dirname => this._http.post<{ data: null }>(`/ndc_api/file/rm/${this.bread.file(dirname)}`, '')),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.copy$.pipe(
            switchMap(filename => this._popup.input({ title: `Copy: ${filename}`, label: 'Filename', value: filename }).pipe(
                filter(value => value && value !== filename),
                switchMap(value => this._http.post<{ data: null }>('/ndc_api/file/cp', {
                    pre: `${this.bread.file(filename)}`,
                    cur: `${this.bread.file(value)}`
                })),
            )),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.rename_file$.pipe(
            switchMap(filename => this._popup.input({ title: `Rename File: ${filename}`, label: 'Filename', value: filename }).pipe(
                filter(value => value && value !== filename),
                switchMap(value => this._http.post<{ data: null }>('/ndc_api/file/rename', {
                    pre: `${this.bread.file(filename)}`,
                    cur: `${this.bread.file(value)}`
                })),
            )),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.create_file$.pipe(
            switchMap(() => this._popup.input({ title: `Create File`, label: 'Filename', value: '' }).pipe(
                filter(value => !!value),
                switchMap(value => this._http.post<{ data: null }>(`/ndc_api/file/write/${this.bread.file(value)}`, '')),
            )),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.create_dir$.pipe(
            switchMap(() => this._popup.input({ title: `Create Directory`, label: 'Dirname', value: '' }).pipe(
                filter(value => !!value),
                switchMap(value => this._http.post<{ data: null }>(`/ndc_api/file/mkdir/${this.bread.file(value)}`, '')),
            )),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.bread.file_stats$.pipe(
            filter(value => !!(value && value.type === 'directory')),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
    }

    upload(files: FileWithPath[]) {
        this.upload_files$.next(files)
    }

    is_all_selected() {
        const num_selected = this.selection.selected.length
        const num_rows = this.files.length
        return num_selected === num_rows
    }

    toggle_all_rows() {
        if (this.is_all_selected()) {
            this.selection.clear()
            return
        }

        this.selection.select(...this.files)
    }

    $cast(value: any) {
        return value as FileDesc
    }

    icon_of(filename: string): string {
        return this._file_type.get_info(filename).icon
    }

    color_of(filename: string): string {
        const file_type_info = this._file_type.get_info(filename)
        switch (file_type_info.category) {
            case 'text':
                return 'text-blue-500'
            case 'image':
                return 'text-green-500'
            case 'video':
                return 'text-red-500'
            case 'audio':
                return 'text-purple-500'
            case 'document':
                return 'text-orange-500'
            case 'archive':
                return 'text-yellow-500'
            default:
                return 'text-gray-500'
        }
    }
}
