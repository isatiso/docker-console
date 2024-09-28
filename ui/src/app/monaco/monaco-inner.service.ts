import { Injectable } from '@angular/core'
import * as monaco from 'monaco-editor'
import * as Prettier from 'prettier'
import yamlPlugin from 'prettier/plugins/yaml'
import { BehaviorSubject } from 'rxjs'

@Injectable()
export class MonacoInnerService {

    prefer_dark$ = new BehaviorSubject(false)
    languages?: monaco.languages.ILanguageExtensionPoint[]

    constructor() {
        monaco.languages.registerDocumentFormattingEditProvider('yaml', {
            provideDocumentFormattingEdits: async (model) => {
                const content = model.getValue()
                try {
                    const formattedContent = await Prettier.format(content, { parser: 'yaml', plugins: [yamlPlugin], tabWidth: 4 })
                    monaco.editor.setModelMarkers(model, 'prettier', [])
                    return [
                        {
                            range: model.getFullModelRange(),
                            text: formattedContent,
                        },
                    ]
                } catch (e: any) {
                    monaco.editor.setModelMarkers(model, 'prettier', [
                        {
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: e.loc.start.line,
                            startColumn: e.loc.start.columne,
                            endLineNumber: e.loc.end.line,
                            endColumn: e.loc.end.column,
                            message: e.message,
                        },
                    ])
                    return []
                }
            },
        })
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
        this.prefer_dark$.next(prefersDark.matches)
        prefersDark.addEventListener('change', e => this.prefer_dark$.next(e.matches))
    }

    get_language_id(ext: string) {
        if (!this.languages) {
            this.languages = monaco.languages.getLanguages()
        }
        return this.languages?.find(l => l.id === ext || l.extensions?.includes('.' + ext))?.id ?? 'plaintext'
    }
}
