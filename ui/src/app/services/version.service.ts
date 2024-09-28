import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { filterNonNullable } from '@docker-console/common'
import { BehaviorSubject, filter, Subject, switchMap, tap, throttleTime } from 'rxjs'
import { PopupService } from '../popup/popup.service'

@Injectable({
    providedIn: 'root'
})
export class VersionService {

    initialized$ = new BehaviorSubject(false)
    versions: any[] = []

    fetch_version$ = new Subject<void>()
    remove_version$ = new Subject<string>()
    update_config$ = new Subject<void>()
    create_config$ = new Subject<void>()

    constructor(
        private _http: HttpClient,
        private _popup: PopupService,
    ) {
        this.create_config$.pipe(
            throttleTime(1000),
            switchMap(() => this._popup.input({ title: 'Target version to copy from:', label: 'Version', value: '' })),
            filterNonNullable(),
            switchMap(version => this._http.post<{ status: string, message: string }>('/ndc_api/service/copy_config', { version })),
            tap(() => this.fetch_version$.next()),
            filter(data => data.status === 'error'),
            tap(data => this._popup.snack(data.message)),
            takeUntilDestroyed(),
        ).subscribe()
        this.update_config$.pipe(
            throttleTime(1000),
            switchMap(() => this._popup.input({ title: 'Config Version, default is "latest"', label: 'Version', value: 'latest' })),
            filterNonNullable(),
            switchMap(version => this._http.post<{ status: string, message: string }>('/ndc_api/service/update', { version })),
            tap(() => this.fetch_version$.next()),
            filter(data => data.status === 'error'),
            tap(data => this._popup.snack(data.message)),
            takeUntilDestroyed(),
        ).subscribe()
        this.remove_version$.pipe(
            switchMap(config_dir => this._popup.warning({
                title: 'Delete Version Config Warning',
                messages: [
                    `Are you sure you want to delete config ${config_dir}?`,
                ],
                pass: config_dir
            })),
            filter(data => !!data),
            switchMap(config_dir => this._http.post<{ data: null }>('/ndc_api/service/remove_local_file', { config_dir })),
            tap(() => this.fetch_version$.next()),
            takeUntilDestroyed(),
        ).subscribe()
    }
}
