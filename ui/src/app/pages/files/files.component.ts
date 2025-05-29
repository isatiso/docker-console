import { AsyncPipe, NgTemplateOutlet } from '@angular/common'
import { Component, ViewChild } from '@angular/core'
import { MatDivider } from '@angular/material/divider'
import { MatTableModule } from '@angular/material/table'
import { BreadcrumbsComponent } from '../../layout/breadcrumbs/breadcrumbs.component'
import { BreadcrumbsService } from '../../layout/breadcrumbs/breadcrumbs.service'
import { FileEditorComponent } from './file-editor/file-editor.component'
import { FileListComponent } from './file-list/file-list.component'
import { FileViewerComponent } from './file-viewer/file-viewer.component'

@Component({
    selector: 'ndc-files',
    imports: [
        MatDivider,
        MatTableModule,
        BreadcrumbsComponent,
        FileListComponent,
        FileEditorComponent,
        FileViewerComponent,
        AsyncPipe,
        NgTemplateOutlet,
    ],
    templateUrl: './files.component.html',
    styleUrl: './files.component.scss'
})
export class FilesComponent {

    @ViewChild('child_component') child_component?: FileEditorComponent | FileListComponent | FileViewerComponent

    constructor(
        public bread: BreadcrumbsService,
    ) {
    }
}
