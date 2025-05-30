import { TitleCasePipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute } from '@angular/router'
import { FileType } from '@tarpit/http'
import type { Stats } from 'node:fs'
import { switchMap, tap } from 'rxjs'
import { BreadcrumbsService } from './breadcrumbs.service'

@Component({
    selector: 'ndc-breadcrumbs',
    imports: [
        TitleCasePipe
    ],
    templateUrl: './breadcrumbs.component.html',
    styleUrl: './breadcrumbs.component.scss'
})
export class BreadcrumbsComponent {
    constructor(
        private _http: HttpClient,
        private _route: ActivatedRoute,
        public bread: BreadcrumbsService,
    ) {
        this.bread.get_file_stats$.pipe(
            switchMap(() => this._http.get<{ data: { stats: Stats, type: FileType } }>(`/ndc_api/file/lstat/${this.bread.current}`)),
            tap(res => this.bread.file_stats$.next({ ...res.data })),
            takeUntilDestroyed(),
        ).subscribe()
        this._route.url.pipe(
            tap(url => this.bread.update(url)),
            takeUntilDestroyed(),
        ).subscribe()
    }
}
