import { Component } from '@angular/core'
import { BreadcrumbsService } from './breadcrumbs.service'

@Component({
    selector: 'ndc-breadcrumbs',
    imports: [],
    templateUrl: './breadcrumbs.component.html',
    styleUrl: './breadcrumbs.component.scss'
})
export class BreadcrumbsComponent {
    constructor(
        public fb: BreadcrumbsService,
    ) {
    }
}
