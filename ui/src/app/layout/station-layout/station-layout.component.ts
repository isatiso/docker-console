import { Component, NgZone, ViewChild } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { tap } from 'rxjs'
import { HeaderComponent } from '../header/header.component'

@Component({
    selector: 'ndc-station-layout',
    templateUrl: './station-layout.component.html',
    imports: [
        HeaderComponent,
        RouterOutlet,
    ],
    styleUrl: './station-layout.component.scss'
})
export class StationLayoutComponent {

    @ViewChild('header') headerComponent?: HeaderComponent

    // start$ = new Subject()

    padding_top = 0
    padding_bottom = 0

    constructor(
        private zone: NgZone,
    ) {
        this.zone.onStable.pipe(
            tap(() => {
                this.padding_top = this.headerComponent?.height ?? 0
            }),
        ).subscribe()
    }

}
