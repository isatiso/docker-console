import { Component, NgZone } from '@angular/core'
import { MatBadge } from '@angular/material/badge'
import { MatRipple } from '@angular/material/core'
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav'
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { DockerService } from '../../services/docker.service'
import { LayoutService } from '../layout.service'

@Component({
    selector: 'ndc-sidenav',
    imports: [
        RouterOutlet,
        MatDrawerContent,
        MatDrawer,
        MatDrawerContainer,
        RouterLink,
        RouterLinkActive,
        MatRipple,
        MatBadge
    ],
    templateUrl: './sidenav.component.html',
    styleUrl: './sidenav.component.scss'
})
export class SidenavComponent {

    constructor(
        public layout: LayoutService,
        public docker: DockerService,
        private zone: NgZone,
        private activated_route: ActivatedRoute,
    ) {
    }

    ngOnInit() {
        this.zone.onStable.subscribe(() => {
            // this.layout.sidenav_open = true
        })
    }
}
