import { DatePipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { MatButton } from '@angular/material/button'
import { MatProgressBar } from '@angular/material/progress-bar'
import { MatTableModule } from '@angular/material/table'
import { DockerService } from '../../services/docker.service'

export function format_bytes(bytes: number) {
    const k = 1024
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

@Component({
    selector: 'ndc-queue',
    imports: [
        MatProgressBar,
        MatButton,
        DatePipe,
        MatTableModule,
    ],
    templateUrl: './queue.component.html',
    styleUrl: './queue.component.scss'
})
export class QueueComponent implements OnInit {

    constructor(
        public docker: DockerService,
        private _http: HttpClient,
    ) {
    }

    ngOnInit() {
    }

    format_bytes(value: number) {
        return format_bytes(value)
    }

    figure_progress_value(layer: {
        id: string
        status: string
        current: number
        total: number
        progress_bar: string
    }) {
        if (layer.status === 'Already exists') {
            return 100
        } else if (layer.status === 'Download complete') {
            return 100
        } else if (layer.status === 'Pull complete') {
            return 100
        } else if (layer.total === 0) {
            return 0
        } else {
            return layer.current / layer.total * 100
        }
    }

    refresh() {
        this._http.post<{ data: any[] }>('/ndc_api/docker/refresh_pull', {}).subscribe()
    }

    stop() {
        this._http.post<{ data: any[] }>('/ndc_api/docker/stop_pull', {}).subscribe()
    }

    task_id(_index: number, element: any) {
        return element.task_id
    }
}
