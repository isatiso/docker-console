import { DockerDef, FileDesc, FileType, projects_validator } from '@docker-console/common'
import { TpConfigData, TpService } from '@tarpit/core'
import archiver from 'archiver'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { concatMap, finalize, of, Subject, switchMap, takeUntil, tap } from 'rxjs'
import stream from 'stream'
import yaml from 'yaml'
import { FileLocker } from '../helpers/file-lock'
import { DockerService } from './docker.service'

/**
 * Manage local files, include services and other files
 */
@TpService()
export class NdcFileService {

    readonly data_path = this._config.get('ndc.data_path')
    projects: Record<string, DockerDef.DefinitionStat> = {}
    private _file_locker = new FileLocker()
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

    async load_projects(name?: string) {
        return new Promise<void>((resolve, reject) => {
            this._load_projects$.next([name, resolve, reject])
        })
    }

    async zip(dir: string): Promise<stream.Transform> {
        const filepath = path.join(this.data_path, dir)
        return this._file_locker.with_read_lock([filepath], async () => {
            const archive = archiver('zip', { zlib: { level: 9 } })
            const pass_through = new stream.PassThrough()
            archive.pipe(pass_through)
            archive.directory(filepath, false)
            await archive.finalize()
            return pass_through
        })
    }

    async read(dir: string, filename: string) {
        const filepath = path.join(this.data_path, dir, filename)
        return this._file_locker.with_read_lock([filepath], async () => {
            return await fsp.readFile(filepath)
        })
    }

    async write(dir: string, filename: string, content: Buffer) {
        const filepath = path.join(this.data_path, dir, filename)
        return this._file_locker.with_write_lock([filepath], async () => {
            await fsp.writeFile(filepath, content)
        })
    }

    async rename(dir: string, filename: string, new_name: string) {
        const old_filepath = path.join(this.data_path, dir, filename)
        const new_filepath = path.join(this.data_path, dir, new_name)
        return this._file_locker.with_write_lock([old_filepath, new_filepath], async () => {
            await fsp.rename(old_filepath, new_filepath)
        })
    }

    async rm(dir: string, filename: string) {
        const filepath = path.join(this.data_path, dir, filename)
        return this._file_locker.with_write_lock([filepath], async () => {
            await fsp.rm(filepath, { recursive: true, force: true })
        })
    }

    async exists(target: string) {
        const filepath = path.join(this.data_path, target)
        return await this._file_locker.with_read_lock([filepath], async () => {
            await fsp.stat(filepath)
            return true
        }).catch(() => false)
    }

    async ls(dir: string): Promise<FileDesc[]> {
        const filepath = path.join(this.data_path, dir)
        return this._file_locker.with_read_lock([filepath], async () => {
            const files = await fsp.readdir(filepath, { withFileTypes: true })
            return Promise.all(files.map(async f => ({
                name: f.name,
                type: this.extract_type(f),
                ...(await fsp.stat(path.join(filepath, f.name)))
            })))
        })
    }

    async rmdir(dir: string) {
        const filepath = path.join(this.data_path, dir)
        return this._file_locker.with_write_lock([filepath], async () => {
            await fsp.rm(filepath, { recursive: true, force: true })
        })
    }

    async mkdir(dir: string) {
        const filepath = path.join(this.data_path, dir)
        return this._file_locker.with_write_lock([filepath], async () => {
            await fsp.mkdir(filepath, { recursive: true })
        })
    }

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

    private extract_type(d: fs.Dirent): FileType {
        if (d.isFile()) {
            return 'file'
        }
        if (d.isDirectory()) {
            return 'directory'
        }
        if (d.isBlockDevice()) {
            return 'block'
        }
        if (d.isCharacterDevice()) {
            return 'character'
        }
        if (d.isSymbolicLink()) {
            return 'link'
        }
        if (d.isFIFO()) {
            return 'fifo'
        }
        if (d.isSocket()) {
            return 'socket'
        }
        return 'unknown'
    }
}
