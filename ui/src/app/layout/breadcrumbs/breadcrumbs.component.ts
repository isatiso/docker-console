import { TitleCasePipe } from '@angular/common'
import { Component } from '@angular/core'
import { BreadcrumbsService } from './breadcrumbs.service'

@Component({
    selector: 'ndc-breadcrumbs',
    imports: [
        TitleCasePipe
    ],
    templateUrl: './breadcrumbs.component.html',
    styleUrl: './breadcrumbs.component.scss'
})
export class BreadcrumbsComponent {
    constructor(
        public bread: BreadcrumbsService,
    ) {
    }
}
