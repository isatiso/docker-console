import { DatePipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatIconButton, MatMiniFabButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatTooltip } from '@angular/material/tooltip'
import { Router } from '@angular/router'
import { DockerApi } from '@docker-console/common'
import { catchError, filter, of, retry, Subject, switchMap, tap } from 'rxjs'
import { webSocket } from 'rxjs/webSocket'
import { PopupService } from '../../popup/popup.service'

@Component({
    selector: 'ndc-volumes',
    imports: [
        MatTooltip,
        MatDivider,
        MatIcon,
        DatePipe,
        MatMiniFabButton,
        MatTableModule,
        MatIconButton,
    ],
    templateUrl: './volumes.component.html',
    styleUrl: './volumes.component.scss'
})
export class VolumesComponent implements OnInit {

    remove_volume$ = new Subject<{ Name: string }>()
    prune_volume$ = new Subject()
    volumes: (DockerApi.VolumeDetail & { created_at: number })[] = []
    private fetch_volumes$ = new Subject()

    constructor(
        private _http: HttpClient,
        private router: Router,
        private popup: PopupService,
    ) {
        this.fetch_volumes$.pipe(
            switchMap(() => webSocket<Record<string, DockerApi.VolumeDetail>>(`//${location.host}/ndc_api/docker/subscribe_volumes`).pipe(
                tap(detail_map => {
                    this.volumes = Object.values(detail_map)
                        .map(c => ({
                            ...c,
                            created_at: new Date(c.CreatedAt ?? '').valueOf(),
                            name: /[a-f0-9]{20,}/.test(c.Name) ? c.Name.slice(0, 12) : c.Name,
                        }))
                        .sort((a, b) => b.created_at - a.created_at)
                }),
                tap(() => console.log(this.volumes)),
                catchError(err => {
                    console.log(err)
                    return of(null)
                }),
                retry({ delay: 1000 }),
            )),
            takeUntilDestroyed(),
        ).subscribe()
        this.prune_volume$.pipe(
            switchMap(() => this.popup.warning({
                title: 'Prune Volumes Warning',
                messages: [
                    'This action will remove all the unused volumes.',
                    `Are you sure you want to delete this volume?`,
                ],
            })),
            filter(data => !!data),
            switchMap(() => this._http.post<{ data: any[] }>('/ndc_api/docker/prune_volumes', {})),
            tap(() => this.fetch_volumes$.next(null)),
            takeUntilDestroyed(),
        ).subscribe()
        this.remove_volume$.pipe(
            switchMap(({ Name }) => this.popup.warning({
                title: 'Delete Volume Warning',
                messages: [
                    'Volume won\'t be removed if any containers are using it',
                    '---',
                    `Volume Name: ${Name}`,
                    '---',
                    `Are you sure you want to delete this volume?`,
                ],
                pass: { Name }
            })),
            filter(data => !!data),
            switchMap(({ Name }) => this._http.post<{ data: any[] }>('/ndc_api/docker/delete_volume', { id: Name })),
            tap(res => console.log(res)),
            tap(() => this.fetch_volumes$.next(null)),
            takeUntilDestroyed(),
        ).subscribe()
    }

    ngOnInit() {
        this.fetch_volumes$.next(null)
    }

    view_detail(id: string) {
        this.router.navigate(['/volumes', id]).then()
    }
}
