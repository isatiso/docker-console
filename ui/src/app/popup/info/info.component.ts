import { Component, Inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

@Component({
    selector: 'ndc-info',
    templateUrl: './info.component.html',
    styleUrls: ['./info.component.scss'],
    standalone: false
})
export class InfoComponent {

    public static width = '1080px'

    constructor(
        public dialogRef: MatDialogRef<InfoComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { raw?: boolean, messages: string[] }
    ) {
    }
}
