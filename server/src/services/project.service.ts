import { DockerDef, projects_validator } from '@docker-console/common'
import { TpConfigData, TpService } from '@tarpit/core'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { concatMap, finalize, of, Subject, switchMap, takeUntil, tap } from 'rxjs'
import yaml from 'yaml'
import { DockerService } from './docker.service'

@TpService()
export class NdcProjectService {

    readonly data_path = this._config.get('ndc.data_path')

    projects: Record<string, DockerDef.DefinitionStat> = {}

    private _load_projects$ = new Subject<[name?: string, resolve?: () => void, reject?: (err: any) => void]>()
    private _pending_task: [name?: string, resolve?: () => void, reject?: (err: any) => void][] = []

    constructor(
        private _config: TpConfigData,
        private _docker: DockerService,
    ) {
        this._load_projects$.pipe(
            tap(task => this._pending_task.push(task)),
            concatMap(([name, resolve, reject]) => of(null).pipe(
                switchMap(() => this._load_projects(name, resolve, reject)),
                tap(() => this._pending_task.shift()),
            )),
            finalize(() => {
                this._pending_task.forEach(task => task[1]?.())
                this._pending_task = []
            }),
        ).subscribe()

        this._docker.on$.pipe(
            tap(() => this._load_projects$.next([])),
            takeUntil(this._docker.off$),
        ).subscribe()
    }

    /**
     * Loads project definitions.
     * @param name Optional project name to load.
     */
    async load(name?: string) {
        return new Promise<void>((resolve, reject) => {
            this._load_projects$.next([name, resolve, reject])
        })
    }

    /**
     * Loads project definitions from files.
     * @param name Optional project name to load.
     * @param resolve Callback for successful loading.
     * @param reject Callback for errors.
     */
    private async _load_projects(name?: string, resolve?: () => void, reject?: (err: any) => void) {
        try {
            if (name) {
                await this._load_single_project(name)
            } else {
                const project_data: typeof this.projects = {}
                const files = await fsp.readdir(path.join(this.data_path, 'projects'), { withFileTypes: true })
                for (const s of files) {
                    if (s.isFile() && s.name.endsWith(`.project.yml`)) {
                        const name = s.name.replace(`.project.yml`, '')
                        await this._load_single_project(name, project_data)
                    } else if (s.isDirectory()) {
                        // TODO: deal with directory
                    }
                }
                this.projects = project_data
            }
            resolve?.()
        } catch (e: any) {
            reject?.(e)
            logger.debug(`Fail to load project ${name}: %O`, e)
        }
    }

    /**
     * Loads a single project definition.
     * @param name Project name to load.
     * @param project_data Optional project data object to populate.
     */
    private async _load_single_project(name: string, project_data?: typeof this.projects) {
        project_data = project_data ?? this.projects
        let stats
        try {
            stats = await fsp.stat(path.join(this.data_path, 'projects', `${name}.project.yml`))
            if (!stats.isFile()) {
                delete project_data[name]
                return
            }
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                delete project_data[name]
                return
            } else {
                throw e
            }
        }
        const content = await fsp.readFile(path.join(this.data_path, 'projects', `${name}.project.yml`), { encoding: 'utf-8' })
        try {
            const def = yaml.parse(content, {})
            const valid = projects_validator(def)
            project_data[name] = { name, content, valid, def, mtimeMs: stats.mtimeMs, filename: `${name}.project.yml`, size: stats.size }
            if (!valid) {
                project_data[name].reason = projects_validator.errors?.map(e => e.message!)
            }
        } catch (e) {
            // TODO: warning log
        }
    }
}
