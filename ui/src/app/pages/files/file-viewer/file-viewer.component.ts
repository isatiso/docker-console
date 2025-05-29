import { Component, TemplateRef, ViewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatButton, MatMiniFabButton } from '@angular/material/button'
import { MatIcon } from '@angular/material/icon'
import { MatTooltip } from '@angular/material/tooltip'
import { of, Subject, switchMap, tap, throttleTime } from 'rxjs'
import { BreadcrumbsService } from '../../../layout/breadcrumbs/breadcrumbs.service'

@Component({
    selector: 'ndc-file-viewer',
    imports: [
        MatIcon,
        MatButton,
        MatMiniFabButton,
        MatTooltip
    ],
    templateUrl: './file-viewer.component.html',
    styleUrl: './file-viewer.component.scss'
})
export class FileViewerComponent {

    @ViewChild('operations') operations_template?: TemplateRef<any>

    downloading = false

    download_file$ = new Subject<void>()

    constructor(
        public bread: BreadcrumbsService,
    ) {
        this.download_file$.pipe(
            throttleTime(800),
            switchMap(() => of(null).pipe(
                tap(() => {
                    const url = this.file_url
                    const a = document.createElement('a')
                    a.href = url
                    a.download = this.bread.filename
                    a.click()
                }),
            )),
            takeUntilDestroyed(),
        ).subscribe()
    }

    get file_url() {
        return `/ndc_api/file/content/${this.bread.current}`
    }
}
