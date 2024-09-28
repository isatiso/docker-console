import { DockerDef, FileDesc, projects_validator } from '@docker-console/common'
import { TpConfigData, TpService } from '@tarpit/core'
import fs from 'node:fs/promises'
import path from 'node:path'
import { switchMap, takeUntil } from 'rxjs'
import yaml from 'yaml'
import { DockerService } from './docker.service'

/**
 * Manage local files, include services and other files
 */
@TpService()
export class NdcFileService {

    readonly data_path = this._config.get('ndc.data_path')
    projects: Record<string, DockerDef.DefinitionStat> = {}
    private _file_lock = false

    constructor(
        private _config: TpConfigData,
        private _docker: DockerService,
    ) {
        this._docker.on$.pipe(
            switchMap(() => this.load_projects()),
            takeUntil(this._docker.off$),
        ).subscribe()
    }

    async load_projects(name?: string) {
        if (this._file_lock) {
            throw new Error('Loading config in progress')
        }
        this._file_lock = true
        try {
            if (name) {
                await this.load_single_project(name)
            } else {
                const project_data: typeof this.projects = {}
                const files = await fs.readdir(path.join(this.data_path, 'projects'), { withFileTypes: true })
                for (const s of files) {
                    if (s.isFile() && s.name.endsWith(`.project.yml`)) {
                        const name = s.name.replace(`.project.yml`, '')
                        await this.load_single_project(name, project_data)
                    } else if (s.isDirectory()) {
                        // TODO: deal with directory
                    }
                }
                this.projects = project_data
            }
        } finally {
            this._file_lock = false
        }
    }

    async read(dir: string, filename: string) {
        if (this._file_lock) {
            throw new Error('Loading config in progress')
        }
        this._file_lock = true
        try {
            const filepath = path.join(this.data_path, dir, filename)
            return await fs.readFile(filepath, { encoding: 'utf-8' })
        } finally {
            this._file_lock = false
        }
    }

    async write(dir: string, filename: string, content: string) {
        if (this._file_lock) {
            throw new Error('Loading config in progress')
        }
        this._file_lock = true
        try {
            const filepath = path.join(this.data_path, dir, filename)
            await fs.writeFile(filepath, content, { encoding: 'utf-8' })
        } finally {
            this._file_lock = false
        }
    }

    async rename(dir: string, filename: string, new_name: string) {
        if (this._file_lock) {
            throw new Error('Loading config in progress')
        }
        this._file_lock = true
        try {
            const old_filepath = path.join(this.data_path, dir, filename)
            const new_filepath = path.join(this.data_path, dir, new_name)
            await fs.rename(old_filepath, new_filepath)
        } finally {
            this._file_lock = false
        }
    }

    async rm(dir: string, filename: string) {
        if (this._file_lock) {
            throw new Error('Loading config in progress')
        }
        this._file_lock = true
        try {
            const filepath = path.join(this.data_path, dir, filename)
            await fs.rm(filepath, { recursive: true, force: true })
        } finally {
            this._file_lock = false
        }
    }

    async exists(target: string) {
        if (this._file_lock) {
            throw new Error('Loading config in progress')
        }
        this._file_lock = true
        try {
            await fs.stat(path.join(this.data_path, target))
            return true
        } catch (e) {
            return false
        } finally {
            this._file_lock = false
        }
    }

    async ls(dir: string): Promise<FileDesc[]> {
        if (this._file_lock) {
            throw new Error('Loading config in progress')
        }
        this._file_lock = true
        try {
            const filepath = path.join(this.data_path, dir)
            const files = await fs.readdir(filepath, { withFileTypes: true })
            return await Promise.all(files.map(async f => {
                return {
                    name: f.name,
                    type: f.isFile() ? 'file' : f.isDirectory() ? 'dir' : 'other',
                    ...(await fs.stat(path.join(filepath, f.name)))
                }
            }))
        } finally {
            this._file_lock = false
        }
    }

    async rmdir(dir: string) {
        if (this._file_lock) {
            throw new Error('Loading config in progress')
        }
        this._file_lock = true
        try {
            const filepath = path.join(this.data_path, dir)
            await fs.rm(filepath, { recursive: true, force: true })
        } finally {
            this._file_lock = false
        }
    }

    async mkdir(dir: string) {
        if (this._file_lock) {
            throw new Error('Loading config in progress')
        }
        this._file_lock = true
        try {
            const filepath = path.join(this.data_path, dir)
            await fs.mkdir(filepath, { recursive: true })
        } finally {
            this._file_lock = false
        }
    }

    private async load_single_project(name: string, project_data?: typeof this.projects) {
        project_data = project_data ?? this.projects
        let stats
        try {
            stats = await fs.stat(path.join(this.data_path, 'projects', `${name}.project.yml`))
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
        const content = await fs.readFile(path.join(this.data_path, 'projects', `${name}.project.yml`), { encoding: 'utf-8' })
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
