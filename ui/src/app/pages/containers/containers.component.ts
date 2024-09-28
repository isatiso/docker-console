import { DatePipe } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatIconButton } from '@angular/material/button'
import { MatDivider } from '@angular/material/divider'
import { MatIcon } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatTooltip } from '@angular/material/tooltip'
import { Router } from '@angular/router'
import { DockerApi } from '@docker-console/common'
import { catchError, of, retry, Subject, switchMap, tap, timer } from 'rxjs'
import { webSocket } from 'rxjs/webSocket'
import { DockerTimePipe } from '../../pipes/docker-time.pipe'
import { DockerService } from '../../services/docker.service'

@Component({
    selector: 'ndc-containers',
    imports: [
        MatTooltip,
        MatDivider,
        MatIcon,
        MatIconButton,
        DockerTimePipe,
        DatePipe,
        MatTableModule,
    ],
    templateUrl: './containers.component.html',
    styleUrl: './containers.component.scss'
})
export class ContainersComponent implements OnInit {

    fetch_containers$ = new Subject<void>()
    update_current_ts$ = new Subject<void>()

    services: Record<string, any> = []
    others: Record<string, any> = []
    containers: (DockerApi.ContainerDetail & {
        created_at: number
        started_at: number
        finished_at: number
        ports: string[]
    })[] = []
    current_ts = Date.now()

    constructor(
        public router: Router,
        public docker: DockerService,
    ) {
        this.update_current_ts$.pipe(
            switchMap(() => timer(0, 500).pipe(
                tap(() => this.current_ts = Date.now()),
            )),
            takeUntilDestroyed(),
        ).subscribe()
        this.fetch_containers$.pipe(
            switchMap(() => webSocket<Record<string, DockerApi.ContainerDetail>>(`ws://${location.host}/ndc_api/docker/subscribe_containers`).pipe(
                tap(detail_map => {
                    this.containers = Object.values(detail_map)
                        .map(c => ({
                            ...c,
                            created_at: new Date(c.Created).valueOf(),
                            started_at: c.State ? new Date(c.State.StartedAt).valueOf() : 0,
                            finished_at: c.State ? new Date(c.State.FinishedAt).valueOf() : 0,
                            ports: Object.entries(c.NetworkSettings.Ports)
                                .filter(([, host]) => host)
                                .map(([port, host]) => `${port} -> ${host[0].HostIp}:${host[0].HostPort}`)
                        }))
                        .sort((a, b) => b.created_at - a.created_at || a.Name.localeCompare(b.Name))
                }),
                tap(() => console.log(this.containers)),
                catchError(err => {
                    console.log(err)
                    return of(null)
                }),
                retry({ delay: 1000 }),
            )),
            takeUntilDestroyed(),
        ).subscribe()
    }

    ngOnInit() {
        this.update_current_ts$.next()
        this.fetch_containers$.next()
    }

    trackContainers(_index: number, element: any) {
        return element.Id
    }

    view_logs(container: any) {
        this.router.navigate(['/logs', container?.Id], { queryParams: { name: container.Name?.slice(1) } }).then()
    }

    view_detail(id: string) {
        this.router.navigate(['/container-inspection', id]).then()
    }

    exec_bash(id: string) {
        this.router.navigate(['/container-exec', id]).then()
    }

    diff_time(value: number) {
        return this.current_ts - value
    }
}
