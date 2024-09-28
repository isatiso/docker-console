import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, forwardRef, inject, Input, NgZone, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import * as monaco from 'monaco-editor'
import { auditTime, filter, finalize, Subject, takeUntil, tap } from 'rxjs'
import { MonacoInnerService } from './monaco-inner.service'

export enum ScrollType {
    Smooth = 0,
    Immediate = 1
}

@Component({
    selector: 'ndc-monaco-editor',
    template: '<div class="editor-container" #editorContainer></div>',
    styleUrl: './monaco-editor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        MonacoInnerService,
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MonacoEditorComponent),
            multi: true
        }
    ],
    encapsulation: ViewEncapsulation.None,
})
export class MonacoEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {

    @ViewChild('editorContainer', { static: true }) _editorContainer?: ElementRef

    private destroy$ = new Subject<void>()
    private zone = inject(NgZone)
    private _value: string = ''
    private _editor?: monaco.editor.IStandaloneCodeEditor

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

    private _options: monaco.editor.IStandaloneEditorConstructionOptions = {}

    get options(): any {
        return this._options
    }

    @Input('options')
    set options(options: any) {
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
        setTimeout(() => this._editor?.setValue(this._value))
    }

    registerOnChange(fn: any): void {
        this.propagateChange = fn
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn
    }

    scrollToLine(line: number) {
        // console.log(this._editor?.getContentHeight())
        console.log(this._editor?.getLayoutInfo())
        this._editor?.revealLineInCenter(line, ScrollType.Smooth)
    }

    scrollToBottom() {
        this._editor?.revealLine(this._editor?.getModel()?.getLineCount() || 0, ScrollType.Smooth)
    }

    getLineCount() {
        return this._editor?.getModel()?.getLineCount() ?? 0
    }

    trigger(source: string | null | undefined, handlerId: string, payload: any) {
        this._editor?.trigger(source, handlerId, payload)
    }

    removeFirstLines(count?: number) {
        count = count || 1
        const model = this._editor?.getModel()
        if (model) {
            const lines = model.getLinesContent()
            const newLines = lines.slice(count)
            model.applyEdits([{
                range: model.getFullModelRange(),
                text: newLines.join('\n')
            }])
        }
    }

    ngAfterViewInit() {
        // this.monaco_service.load_monaco().then(() => {
        // })
        this.init_monaco(this._options)
    }

    ngOnDestroy() {
        this.destroy$.next()
    }

    protected init_monaco(options: monaco.editor.IStandaloneEditorConstructionOptions): void {

        this._editor = monaco.editor.create(this._editorContainer!.nativeElement, {
            ...options,
            autoIndent: 'full',
            language: this.monaco_service.get_language_id(options.language ?? 'plaintext'),
            theme: this.monaco_service.prefer_dark$.value ? 'vs-dark' : 'vs'
        })
        this._editor!.setValue(this._value)
        this._editor!.onDidChangeModelContent(() => {
            const value = this._editor!.getValue()
            // value is not propagated to parent when executing outside zone.
            this.zone.run(() => {
                this.propagateChange(value)
                this._value = value
            })
        })

        this._editor!.onDidBlurEditorWidget(() => this.onTouched())

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
