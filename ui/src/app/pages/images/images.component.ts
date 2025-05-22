import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatIconButton, MatMiniFabButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatTooltip } from '@angular/material/tooltip'
import { Router } from '@angular/router'
import { DockerApi } from '@docker-console/common'
import { catchError, filter, map, of, retry, Subject, switchMap, tap, throttleTime } from 'rxjs'
import { webSocket } from 'rxjs/webSocket'
import { BytesPipe } from '../../pipes/bytes.pipe'
import { PopupService } from '../../popup/popup.service'

@Component({
    selector: 'ndc-images',
    imports: [
        MatTooltip,
        MatDivider,
        MatIcon,
        MatMiniFabButton,
        MatTableModule,
        MatIconButton,
        BytesPipe,
    ],
    templateUrl: './images.component.html',
    styleUrl: './images.component.scss'
})
export class ImagesComponent {

    remove_image$ = new Subject<{ id: string }>()
    pull_image$ = new Subject()
    images: (DockerApi.ImageDetail & {
        created_at: number
    })[] = []
    private fetch_images$ = new Subject()

    constructor(
        private _http: HttpClient,
        private _router: Router,
        private popup: PopupService,
    ) {
        this.pull_image$.pipe(
            throttleTime(1000),
            switchMap(() => this.popup.input({ title: 'Image Tag, eg: node:20.9.0', label: 'Image Tag' })),
            filter(data => !!data),
            switchMap(tag => this._http.post('/ndc_api/docker/pull', { tag })),
            tap(data => console.log(data)),
            takeUntilDestroyed(),
        ).subscribe()
        this.fetch_images$.pipe(
            switchMap(() => webSocket<Record<string, DockerApi.ImageDetail>>(`//${location.host}/ndc_api/docker/subscribe_images`).pipe(
                tap(detail_map => {
                    this.images = Object.values(detail_map)
                        .map(c => ({
                            ...c,
                            created_at: new Date(c.Created).valueOf(),
                        }))
                        .flatMap(img => img.RepoTags.map((tag: string) => ({ ...img, tag })))
                        .sort((a, b) => b.created_at - a.created_at)
                }),
                tap(() => console.log(this.images)),
                catchError(err => {
                    console.log(err)
                    return of(null)
                }),
                retry({ delay: 1000 }),
            )),
            takeUntilDestroyed(),
        ).subscribe()
        this.remove_image$.pipe(
            switchMap(({ id }) => this.popup.warning({
                title: 'Delete Image Warning',
                messages: [
                    'Image won\'t be removed if any containers are using it',
                    '---',
                    `Image Tag: ${id}`,
                    '---',
                    `Are you sure you want to delete this image?`,
                ],
                pass: { id }
            })),
            filter(data => !!data),
            switchMap(({ id }) => of(null).pipe(
                switchMap(() => this._http.post<{ data: DockerApi.ContainerDetail[] }>('/ndc_api/docker/list_containers', {})),
                map(res => res.data.map(n => n.Image)),
                filter(running_images => {
                    if (running_images.includes(id)) {
                        this.popup.snack('Can\'t remove image, containers are using it')
                        return false
                    }
                    return true
                }),
                map(() => id),
            )),
            switchMap(id => this._http.post<{ data: any[] }>('/ndc_api/docker/delete_image', { id })),
            takeUntilDestroyed(),
        ).subscribe()
    }

    ngOnInit() {
        this.fetch_images$.next(null)
    }

    view_detail(id: string) {
        this._router.navigate(['/images', id]).then()
    }
}
