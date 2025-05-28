import { DatePipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatIconButton, MatMiniFabButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatTooltip } from '@angular/material/tooltip'
import { ActivatedRoute, Router } from '@angular/router'
import { DockerDef } from '@docker-console/common'
import { filter, map, Subject, switchMap, tap } from 'rxjs'
import { BreadcrumbsComponent } from '../../layout/breadcrumbs/breadcrumbs.component'
import { BreadcrumbsService } from '../../layout/breadcrumbs/breadcrumbs.service'
import { BytesPipe } from '../../pipes/bytes.pipe'
import { PopupService } from '../../popup/popup.service'
import { ToolsService } from '../../services/tools.service'

interface DefinitionsResponse {
    data: Record<string, DockerDef.DefinitionStat>
}

@Component({
    selector: 'ndc-projects',
    imports: [
        MatDivider,
        DatePipe,
        MatIcon,
        MatMiniFabButton,
        MatTooltip,
        MatTableModule,
        MatIconButton,
        BytesPipe,
        BreadcrumbsComponent,
    ],
    templateUrl: './projects.component.html',
    styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {

    files: DockerDef.DefinitionStat[] = []
    definition_stats: DefinitionsResponse['data'] = {}

    list_files$ = new Subject<void>()
    rename_file$ = new Subject<string>()
    remove_file$ = new Subject<string>()
    copy$ = new Subject<string>()
    create_file$ = new Subject<void>()
    project_up$ = new Subject<string>()
    project_down$ = new Subject<string>()

    constructor(
        private _http: HttpClient,
        private _router: Router,
        private _tools: ToolsService,
        private _route: ActivatedRoute,
        private popup: PopupService,
        public bread: BreadcrumbsService,
    ) {
        this.list_files$.pipe(
            switchMap(category => this._http.post<DefinitionsResponse>('/ndc_api/project/list', {}).pipe(
                map(res => res.data),
                tap(data => this.definition_stats = data),
                tap(data => this.files = Object.values(data).sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name)))
            )),
            tap(files => console.log(files)),
            takeUntilDestroyed(),
        ).subscribe()
        this.remove_file$.pipe(
            switchMap(filename => this.popup.warning({
                title: `Remove File`,
                messages: [
                    `Remove File: ${filename}.project.yml`,
                    'Are you sure?'
                ],
                pass: `${filename}.project.yml`
            })),
            filter(value => !!value),
            switchMap(filename => this._http.post<{ data: null }>(`/ndc_api/project/rm/${filename}`, '')),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.rename_file$.pipe(
            map(filename => filename.replace(`.project.yml`, '')),
            switchMap(filename => this.popup.input({ title: `Rename File: ${filename}`, label: 'Filename', value: filename, suffix: `.project.yml` }).pipe(
                filter(value => value && value !== filename),
                map(new_name => [filename + `.project.yml`, new_name + `.project.yml`] as const)
            )),
            switchMap(([old, to]) => this._http.post<{ data: null }>('/ndc_api/project/rename', { old, to })),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.copy$.pipe(
            map(filename => filename.replace(`.project.yml`, '')),
            switchMap(filename => this.popup.input({ title: `Copy: ${filename}`, label: 'Filename', value: filename, suffix: `.project.yml` }).pipe(
                filter(value => value && value !== filename),
                map(new_name => [filename + `.project.yml`, new_name + `.project.yml`] as const)
            )),
            switchMap(([src, dst]) => this._http.post<{ data: null }>('/ndc_api/project/cp', { src, dst })),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.create_file$.pipe(
            switchMap(() => this.popup.input({ title: `Create File`, label: 'Filename', value: '', suffix: `.project.yml` })),
            filter(value => !!value),
            map(value => value + `.project.yml`),
            switchMap(filename => this._http.post<{ data: null }>(`/ndc_api/project/write/${filename}`, '')),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.project_up$.pipe(
            switchMap(name => this._http.post<{ data: any }>('/ndc_api/service/project_up', { name })),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this.project_down$.pipe(
            switchMap(name => this._http.post<{ data: any }>('/ndc_api/service/project_down', { name })),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
        this._route.url.pipe(
            tap(url => this.bread.update(url)),
            tap(() => this.list_files$.next()),
            takeUntilDestroyed(),
        ).subscribe()
    }

    ngOnInit() {
    }

    navigate(name: string) {
        this._router.navigate(['/projects']).then()
    }

    go_edit(name: string) {
        this._router.navigate(['/projects', name]).then()
    }
}
