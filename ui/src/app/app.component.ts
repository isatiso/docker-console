import { CommonModule, DOCUMENT } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject, OnInit } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { PopupModule } from './popup/popup.module'
import { ConfigService } from './services/config.service'

@Component({
    selector: 'ndc-root',
    imports: [
        CommonModule,
        PopupModule,
        RouterOutlet,
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

    constructor(
        @Inject(DOCUMENT) private document: Document,
        private _config: ConfigService,
        private _http: HttpClient,
    ) {
    }

    ngOnInit() {
        this._http.post<{ data: { version: string, container_id: string } }>('/ndc_api/service/version', {}).subscribe(data => {
            this._config.version = data.data.version
            this._config.container_id = data.data.container_id
            this.document.title = `Docker Console - ${data.data.version}`
        })
    }
}
