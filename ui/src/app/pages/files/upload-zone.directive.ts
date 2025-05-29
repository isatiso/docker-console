import { Overlay, OverlayRef } from '@angular/cdk/overlay'
import { ComponentPortal } from '@angular/cdk/portal'
import { Directive, ElementRef, EventEmitter, HostListener, Injector, OnDestroy, Output, ViewContainerRef, } from '@angular/core'
import { UploadOverlayComponent } from '../../layout/upload-overlay/upload-overlay.component'

export interface FileWithPath {
    file: File
    path: string
}

@Directive({
    selector: '[uploadZone]',
})
export class UploadZoneDirective implements OnDestroy {
    private depth = 0
    private overlay_ref?: OverlayRef

    @Output()
    upload: EventEmitter<FileWithPath[]> = new EventEmitter()

    constructor(
        private host: ElementRef<HTMLElement>,
        private overlay: Overlay,
        private vcr: ViewContainerRef,
        private injector: Injector,
    ) {
    }

    @HostListener('dragenter', ['$event'])
    on_enter(evt: DragEvent) {
        evt.preventDefault()
        evt.stopPropagation()
        if (evt.currentTarget === this.host.nativeElement) {
            if (this.depth++ === 0) {
                console.log('dragenter')
                this.open_overlay()
            }
        }
    }

    @HostListener('dragleave', ['$event'])
    on_leave(evt: DragEvent) {
        evt.preventDefault()
        evt.stopPropagation()
        /* Same rule: only when leaving the host itself. */
        if (evt.currentTarget === this.host.nativeElement) {
            if (--this.depth === 0) {
                console.log('dragleave', evt.currentTarget, evt.relatedTarget)
                this.close_overlay()
            }
        }
    }

    @HostListener('dragover', ['$event'])
    on_over(evt: DragEvent) {
        evt.preventDefault()
        evt.stopPropagation()
        /* Optional UX hint: */
        evt.dataTransfer!.dropEffect = 'copy'
    }

    @HostListener('drop', ['$event'])
    async on_drop(evt: DragEvent) {
        evt.preventDefault()
        evt.stopPropagation()
        this.depth = 0
        this.close_overlay()
        
        const files: FileWithPath[] = []
        const items = evt.dataTransfer?.items
        
        if (items?.length) {
            // First, collect all entries synchronously
            const entries: FileSystemEntry[] = []
            for (let i = 0; i < items.length; i++) {
                if (items[i].kind === 'file') {
                    const entry = items[i].webkitGetAsEntry()
                    if (entry) {
                        entries.push(entry)
                    }
                }
            }
            
            // Then process all entries asynchronously
            for (const entry of entries) {
                await this.process_entry(entry, '', files)
            }
        }
        
        this.upload.emit(files)
    }

    private async process_entry(entry: FileSystemEntry, base_path: string, files: FileWithPath[]): Promise<void> {
        if (entry.isFile) {
            const file_entry = entry as FileSystemFileEntry
            const file = await this.get_file_from_entry(file_entry)
            const full_path = base_path ? `${base_path}/${entry.name}` : entry.name
            files.push({ file, path: full_path })
        } else if (entry.isDirectory) {
            const dir_entry = entry as FileSystemDirectoryEntry
            const entries = await this.read_directory(dir_entry)
            const new_base_path = base_path ? `${base_path}/${entry.name}` : entry.name
            
            for (const child_entry of entries) {
                await this.process_entry(child_entry, new_base_path, files)
            }
        }
    }

    private get_file_from_entry(file_entry: FileSystemFileEntry): Promise<File> {
        return new Promise((resolve, reject) => {
            file_entry.file(resolve, reject)
        })
    }

    private read_directory(dir_entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
        return new Promise((resolve, reject) => {
            const reader = dir_entry.createReader()
            const entries: FileSystemEntry[] = []

            const read_entries = () => {
                reader.readEntries((results) => {
                    if (results.length === 0) {
                        resolve(entries)
                    } else {
                        entries.push(...results)
                        read_entries() // Continue reading if there are more entries
                    }
                }, reject)
            }

            read_entries()
        })
    }

    private open_overlay() {
        if (this.overlay_ref) {
            return
        }

        const rect = this.host.nativeElement.getBoundingClientRect()
        const position = this.overlay
            .position()
            .global()
            .left(rect.left + window.scrollX + 'px')
            .top(rect.top + window.scrollY + 'px')

        this.overlay_ref = this.overlay.create({
            positionStrategy: position,
            width: rect.width,
            height: rect.height,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            panelClass: 'dropzone-overlay',
        })

        this.overlay_ref.attach(
            new ComponentPortal(UploadOverlayComponent, this.vcr, this.injector),
        )
    }

    private close_overlay() {
        this.overlay_ref?.dispose()
        this.overlay_ref = undefined
    }

    ngOnDestroy() {
        this.close_overlay()
    }
}

