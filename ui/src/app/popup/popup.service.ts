import { ComponentType } from '@angular/cdk/portal'
import { Injectable, TemplateRef } from '@angular/core'
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog'
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar'
import { Observable } from 'rxjs'
import { InfoComponent } from './info/info.component'
import { SingleInputComponent } from './single-input/single-input.component'
import { ViewComponent } from './view/view.component'
import { WarningComponent } from './warning/warning.component'

@Injectable({
    providedIn: 'root'
})
export class PopupService {

    constructor(
        private _snackbar: MatSnackBar,
        private _dialog: MatDialog,
    ) {
    }

    snack(message: string, config?: MatSnackBarConfig) {
        const default_config = {
            duration: 5000,
            verticalPosition: 'top'
        }
        return this._snackbar.open(message, 'OK', Object.assign({}, default_config, config)).afterDismissed()
    }

    warning<T = any>(data: WarningComponent['data']): Observable<T | undefined> {
        return this.setup_dialog(WarningComponent, data, { maxWidth: '90vw' })
    }

    input(data: SingleInputComponent['data']): Observable<any> {
        return this.setup_dialog(SingleInputComponent, data, { maxWidth: '90vw' })
    }

    notice(data: InfoComponent['data']): Observable<any> {
        return this.setup_dialog(InfoComponent, data)
    }

    show(template: TemplateRef<{ dialog: MatDialogRef<any> }>, context?: any, config?: MatDialogConfig) {
        return this.setup_dialog(ViewComponent, { template, context }, { minWidth: '760px', width: '90vw', maxWidth: '90vw', ...config })
    }

    setup_dialog<T extends { data: any }, R = any>(
        component: ComponentType<T> & { width: string },
        data: T['data'],
        config?: MatDialogConfig<T['data']>
    ): Observable<R | undefined> {
        return this._dialog.open<T, T['data'], R>(component, { width: component.width, ...config, data: data ?? {} }).afterClosed()
    }
}
