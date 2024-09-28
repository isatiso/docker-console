import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, forwardRef, inject, Input, NgZone, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import * as monaco from 'monaco-editor'
import { auditTime, filter, finalize, Subject, takeUntil, tap } from 'rxjs'
import { MonacoInnerService } from './monaco-inner.service'

export interface DiffEditorModel {
    code: string
    language: string
}

@Component({
    selector: 'ndc-monaco-diff-editor',
    template: '<div class="editor-container" #editorContainer></div>',
    styleUrl: './monaco-editor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        MonacoInnerService,
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MonacoDiffEditorComponent),
            multi: true
        }
    ],
    encapsulation: ViewEncapsulation.None,
})
export class MonacoDiffEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {

    @ViewChild('editorContainer', { static: true }) _editorContainer?: ElementRef

    private destroy$ = new Subject<void>()
    private zone = inject(NgZone)
    private _value = ''
    private _editor?: monaco.editor.IStandaloneDiffEditor

    constructor(
        private monaco_service: MonacoInnerService,
        private ref: ElementRef,
    ) {
        this.monaco_service.prefer_dark$.pipe(
            filter(() => typeof monaco !== 'undefined'),
            tap(prefer_dark => monaco.editor.setTheme(prefer_dark ? 'vs-dark' : 'vs')),
            takeUntilDestroyed(),
        ).subscribe()
    }

    private _originalModel?: DiffEditorModel
    @Input('originalModel')
    set originalModel(model: DiffEditorModel) {
        this._originalModel = model
        if (this._editor) {
            this._editor.dispose()
            this.init_monaco(this.options)
        }
    }

    private _modifiedModel?: DiffEditorModel
    @Input('modifiedModel')
    set modifiedModel(model: DiffEditorModel) {
        this._modifiedModel = model
        if (this._editor) {
            this._editor.dispose()
            this.init_monaco(this.options)
        }
    }

    private _options: monaco.editor.IStandaloneDiffEditorConstructionOptions = {}
    get options() {
        return this._options
    }

    @Input('options')
    set options(options: monaco.editor.IStandaloneDiffEditorConstructionOptions) {
        this._options = options
        if (this._editor) {
            this._editor.dispose()
            this.init_monaco(options)
        }
    }

    propagateChange = (_: any) => {
    }

    onTouched = () => {
    }

    writeValue(value: any): void {
        this._value = value || ''
        // Fix for value change while dispose in process.
        setTimeout(() => {
            if (this._editor) {
                this._editor?.getModifiedEditor().setValue(this._value)
            }
        })
    }

    registerOnChange(fn: any): void {
        this.propagateChange = fn
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn
    }

    ngAfterViewInit() {
        // this.monaco_service.load_monaco().then(() => {
        // })
        this.init_monaco(this._options)
    }

    ngOnDestroy() {
        this.destroy$.next()
    }

    protected init_monaco(options: monaco.editor.IStandaloneDiffEditorConstructionOptions): void {
        if (!this._originalModel || !this._modifiedModel) {
            throw new Error('originalModel or modifiedModel not found for ndc-monaco-diff-editor')
        }

        this._originalModel.language = this._originalModel.language ?? 'plaintext'
        this._modifiedModel.language = this._modifiedModel.language ?? 'plaintext'

        const originalModel = monaco.editor.createModel(this._originalModel.code, this.monaco_service.get_language_id(this._originalModel.language))
        const modifiedModel = monaco.editor.createModel(this._modifiedModel.code, this.monaco_service.get_language_id(this._modifiedModel.language))

        const theme = options.theme

        this._editorContainer!.nativeElement.innerHTML = ''
        this._editor = monaco.editor.createDiffEditor(this._editorContainer!.nativeElement, {
            ...options,
            theme: this.monaco_service.prefer_dark$.value ? 'vs-dark' : 'vs'
        })

        options.theme = theme
        this._editor!.setModel({
            original: originalModel,
            modified: modifiedModel
        })

        this._editor!.getModifiedEditor().onDidChangeModelContent(() => {
            const value = this._editor!.getModifiedEditor().getValue()
            // value is not propagated to parent when executing outside zone.
            this.zone.run(() => {
                this.propagateChange(value)
                this._value = value
            })
        })

        this._editor!.getModifiedEditor().onDidBlurEditorWidget(() => this.onTouched())

        const resize$ = new Subject<void>()
        const obs = new ResizeObserver(entries => resize$.next())
        obs.observe(this.ref.nativeElement.parentElement)
        resize$.pipe(
            auditTime(100),
            tap(() => this._editor!.layout()),
            takeUntil(this.destroy$),
            finalize(() => obs.unobserve(this.ref.nativeElement.parentElement)),
        ).subscribe()
    }
}
