import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { InfoComponent } from './info/info.component'
import { SingleInputComponent } from './single-input/single-input.component'
import { ViewComponent } from './view/view.component'
import { WarningComponent } from './warning/warning.component'

@NgModule({
    declarations: [
        InfoComponent,
        WarningComponent,
        SingleInputComponent,
        ViewComponent,
    ],
    imports: [
        CommonModule,
        MatDialogModule,
        MatSnackBarModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        FormsModule,
    ],
})
export class PopupModule {
}
