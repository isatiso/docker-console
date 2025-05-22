import { Component, Inject } from '@angular/core'
import { ThemePalette } from '@angular/material/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

interface ActionDef {
    name: string,
    data: any,
    color?: ThemePalette
}

@Component({
    selector: 'ndc-warning',
    templateUrl: './warning.component.html',
    styleUrls: ['./warning.component.scss'],
    standalone: false
})
export class WarningComponent<T = any> {

    public static width = '1080px'
    public actions: ActionDef[] = []

    constructor(
        public dialogRef: MatDialogRef<WarningComponent<T>>,
        @Inject(MAT_DIALOG_DATA) public data: {
            title: string
            messages: string[]
            pass?: T
            actions?: ActionDef[]
        }
    ) {
        this.actions = data.actions ?? []
    }
}
