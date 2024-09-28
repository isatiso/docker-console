import { bootstrapApplication } from '@angular/platform-browser'
import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'

window.MonacoEnvironment = {
    getWorker: (moduleId, label) => {
        if (label === 'json') {
            return new Worker('./assets/monaco-editor/esm/vs/language/json/json.worker.js', { name: label, type: 'module' })
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new Worker('./assets/monaco-editor/esm/vs/language/css/css.worker.js', { name: label, type: 'module' })
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new Worker('./assets/monaco-editor/esm/vs/language/html/html.worker.js', { name: label, type: 'module' })
        }
        if (label === 'typescript' || label === 'javascript') {
            return new Worker('./assets/monaco-editor/esm/vs/language/typescript/ts.worker.js', { name: label, type: 'module' })
        }
        return new Worker('./assets/monaco-editor/esm/vs/editor/editor.worker.js', { name: label, type: 'module' })
    }
}

bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err))
