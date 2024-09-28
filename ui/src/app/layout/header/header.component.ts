import { AsyncPipe } from '@angular/common'
import { Component, ElementRef, Self } from '@angular/core'
import { MatIconButton } from '@angular/material/button'
import { MatChip } from '@angular/material/chips'
import { MatIcon } from '@angular/material/icon'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { MatToolbar } from '@angular/material/toolbar'
import { NdcPreloadAllModules } from '../../app.config'
import { ConfigService } from '../../services/config.service'
import { LayoutService } from '../layout.service'

@Component({
    selector: 'ndc-header',
    imports: [
        MatIcon,
        MatToolbar,
        MatIconButton,
        MatChip,
        AsyncPipe,
        MatProgressSpinner
    ],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {

    constructor(
        @Self() public element: ElementRef,
        public layout: LayoutService,
        public config: ConfigService,
        public preload_strategy: NdcPreloadAllModules,
    ) {
    }

    get height() {
        return this.element.nativeElement.clientHeight
    }

    toggle_side() {
        this.layout.sidenav_open = !this.layout.sidenav_open
    }
}
