import { Injectable } from '@angular/core'

@Injectable({
    providedIn: 'root'
})
export class LayoutService {

    title = 'Docker Console'
    sidenav_open = true
    _theme: 'dark' | 'light' = 'dark'

    constructor() {
        this._theme = (typeof document !== 'undefined' && document.body.getAttribute('data-ndc-theme') === 'light') ? 'light' : 'dark'
    }

    get theme() {
        return this._theme
    }

    select_theme(t: 'dark' | 'light') {
        this._theme = t
        document.body.setAttribute('data-ndc-theme', t)
    }

    toggle_theme() {
        if (typeof document !== 'undefined') {
            if (document.body.getAttribute('data-ndc-theme') === 'dark') {
                this._theme = 'light'
                document.body.setAttribute('data-ndc-theme', 'light')
            } else {
                this._theme = 'dark'
                document.body.setAttribute('data-ndc-theme', 'dark')
            }
        }
    }
}
