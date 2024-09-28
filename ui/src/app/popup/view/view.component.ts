import { AfterViewChecked, Component, ElementRef, Inject, TemplateRef, ViewChild } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

@Component({
    selector: 'ndc-view',
    templateUrl: './view.component.html',
    styleUrls: ['./view.component.scss'],
    standalone: false
})
export class ViewComponent implements AfterViewChecked {

    public static width = '1080px'
    @ViewChild('container') container?: ElementRef<HTMLElement>
    @ViewChild('body') body?: ElementRef<HTMLElement>
    context = { ...this.data.context, dialog: this.dialog }

    constructor(
        public dialog: MatDialogRef<ViewComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {
            template: TemplateRef<{ dialog: MatDialogRef<any> }>,
            context: any
        }
    ) {
    }

    ngAfterViewChecked(): void {
        if (this.container && this.body) {
            this.container.nativeElement.style.maxHeight = this.body.nativeElement.clientHeight + 'px'
            this.container.nativeElement.style.minHeight = this.body.nativeElement.clientHeight + 'px'
        }
    }
}
