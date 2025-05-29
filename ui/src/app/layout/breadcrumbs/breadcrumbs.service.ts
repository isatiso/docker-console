import { Location } from '@angular/common'
import { Injectable } from '@angular/core'
import { Router, UrlSegment } from '@angular/router'
import type { Stats } from 'node:fs'
import { BehaviorSubject } from 'rxjs'

@Injectable({
    providedIn: 'root'
})
export class BreadcrumbsService {

    category: 'projects' | 'files' = 'files'
    segments: { name: string, path: string }[] = []
    file_stats$ = new BehaviorSubject<{ stats: Stats, type: 'directory' | 'file' } | undefined>(undefined)

    constructor(
        private _router: Router,
        private _location: Location,
    ) {
    }

    get filename() {
        return this.segments.slice(-1)[0].name
    }

    get current() {
        return this.segments.map(s => s.name).join('/')
    }

    get lang() {
        return this.filename.split('.').slice(-1)[0]
    }

    file(name: string) {
        if (this.current) {
            console.log(this.current)
            return this.current + '/' + name
        } else {
            return name
        }
    }

    go_back() {
        this._location.back()
    }

    go_edit(name: string) {
        void this._router.navigate(['files', ...this.segments.map(d => d.name), name])
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
            console.log(this.segments)
        } else {
            this.segments = []
        }
    }
}

