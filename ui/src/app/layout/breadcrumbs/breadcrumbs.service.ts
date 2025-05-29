import { Location } from '@angular/common'
import { Injectable } from '@angular/core'
import { Router, UrlSegment } from '@angular/router'
import { FileType } from '@tarpit/http'
import type { Stats } from 'node:fs'
import { BehaviorSubject, filter, Subject, tap } from 'rxjs'
import { FileTypeInfo, FileTypeService } from '../../services/file-type.service'

@Injectable({
    providedIn: 'root'
})
export class BreadcrumbsService {

    category: 'projects' | 'files' = 'files'
    segments: { name: string, path: string }[] = []
    type: FileType = 'unknown'
    info?: FileTypeInfo

    get_file_stats$ = new Subject<void>()
    file_stats$ = new BehaviorSubject<{ stats: Stats, type: FileType } | undefined>(undefined)

    constructor(
        private _router: Router,
        private _location: Location,
        private _file_type: FileTypeService,
    ) {
        this.file_stats$.pipe(
            filter(stats => !!stats),
            tap(stats => this.type = stats.type),
        ).subscribe()
    }

    get filename() {
        return this.segments.slice(-1)[0]?.name
    }

    get current() {
        return this.segments.map(s => s.name).join('/')
    }

    file(name: string) {
        return this.current ? this.current + '/' + name : name
    }

    go_back() {
        this._location.back()
    }

    step_in(name: string) {
        void this._router.navigate([this.category, ...this.segments.map(d => d.name), name])
    }

    step_out(filepath: string) {
        void this._router.navigate([this.category, ...filepath.split('/').filter(Boolean)])
    }

    update(url: UrlSegment[]) {
        const [first_segm] = this._router.url.split('/').slice(1, 3)
        if (first_segm === 'files' || first_segm === 'preview' || first_segm === 'projects') {
            this.category = first_segm === 'projects' ? 'projects' : 'files'
            const segments = url.slice(1).map(u => u.path)
            this.segments = segments.map((name, i) => ({ name, path: '/' + segments.slice(0, i + 1).join('/') }))
        } else {
            this.segments = []
        }
        if (this.segments.length > 0) {
            this.info = this._file_type.get_info(this.filename)
        } else {
            this.info = undefined
        }
        this.get_file_stats$.next()
    }
}

