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
    selector: 'ndc-networks',
    imports: [
        MatTableModule,
        MatTooltip,
        MatDivider,
        MatIcon,
        DatePipe,
        MatMiniFabButton,
        MatIconButton,
    ],
    templateUrl: './networks.component.html',
    styleUrl: './networks.component.scss'
})
export class NetworksComponent implements OnInit {

    private fetch_networks$ = new Subject()
    remove_network$ = new Subject<{ id: string }>()
    prune_network$ = new Subject()

    networks: (DockerApi.NetworkDetail & {
        created_at: number
    })[] = []

    constructor(
        private _http: HttpClient,
        private router: Router,
        private popup: PopupService,
    ) {
        this.fetch_networks$.pipe(
            switchMap(() => webSocket<Record<string, DockerApi.NetworkDetail>>(`//${location.host}/ndc_api/docker/subscribe_networks`).pipe(
                tap(detail_map => {
                    this.networks = Object.values(detail_map)
                        .map(c => ({
                            ...c,
                            created_at: new Date(c.Created).valueOf(),
                        }))
                        .sort((a, b) => b.created_at - a.created_at)
                }),
                tap(() => console.log(this.networks)),
                catchError(err => {
                    console.log(err)
                    return of(null)
                }),
                retry({ delay: 1000 }),
            )),
            takeUntilDestroyed(),
        ).subscribe()
        this.prune_network$.pipe(
            switchMap(() => this.popup.warning({
                title: 'Prune Network Warning',
                messages: [
                    'This action will remove all the unused networks.',
                    `Are you sure you want to delete this network?`,
                ],
            })),
            filter(data => !!data),
            switchMap(() => this._http.post<{ data: any[] }>('/ndc_api/docker/prune_networks', {})),
            tap(() => this.fetch_networks$.next(null)),
            takeUntilDestroyed(),
        ).subscribe()
        this.remove_network$.pipe(
            switchMap(({ id }) => this.popup.warning({
                title: 'Delete Network Warning',
                messages: [
                    'Network won\'t be removed if any containers are using it',
                    '---',
                    `Network Id: ${id}`,
                    `Network Name: ${this.networks.find(n => n.Id === id)?.Name}`,
                    '---',
                    `Are you sure you want to delete this network?`,
                ],
                pass: { id }
            })),
            filter(data => !!data),
            switchMap(({ id }) => this._http.post<{ data: any[] }>('/ndc_api/docker/delete_network', { id })),
            tap(res => console.log(res)),
            tap(() => this.fetch_networks$.next(null)),
            takeUntilDestroyed(),
        ).subscribe()
    }

    ngOnInit() {
        this.fetch_networks$.next(null)
    }

    view_detail(id: string) {
        this.router.navigate(['/networks', id]).then()
    }
}
