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
 * Service for managing file operations and project definitions.
 * Handles file locking, reading, writing, zipping, and project loading.
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

    /**
     * Loads project definitions.
     * @param name Optional project name to load.
     */
    async load_projects(name?: string) {
        return new Promise<void>((resolve, reject) => {
            this._load_projects$.next([name, resolve, reject])
        })
    }

    /**
     * Creates a zip archive of a directory.
     * @param dir Directory to zip.
     * @returns A stream of the zip archive.
     */
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

    /**
     * Reads a file's content.
     * @param dir Directory containing the file.
     * @param filename Name of the file to read.
     * @returns File content as a Buffer.
     */
    async read(dir: string, filename: string) {
        const filepath = path.join(this.data_path, dir, filename)
        return this._file_locker.with_read_lock([filepath], async () => {
            return await fsp.readFile(filepath)
        })
    }

    /**
     * Writes content to a file.
     * @param dir Directory to write the file in.
     * @param filename Name of the file to write.
     * @param content Content to write to the file.
     */
    async write(dir: string, filename: string, content: Buffer) {
        const filepath = path.join(this.data_path, dir, filename)
        return this._file_locker.with_write_lock([filepath], async () => {
            await fsp.writeFile(filepath, content)
        })
    }

    /**
     * Renames a file.
     * @param dir Directory containing the file.
     * @param filename Current name of the file.
     * @param new_name New name for the file.
     */
    async rename(dir: string, filename: string, new_name: string) {
        const old_filepath = path.join(this.data_path, dir, filename)
        const new_filepath = path.join(this.data_path, dir, new_name)
        return this._file_locker.with_write_lock([old_filepath, new_filepath], async () => {
            await fsp.rename(old_filepath, new_filepath)
        })
    }

    /**
     * Removes a file or directory.
     * @param dir Directory containing the file.
     * @param filename Name of the file to remove.
     */
    async rm(dir: string, filename: string) {
        const filepath = path.join(this.data_path, dir, filename)
        return this._file_locker.with_write_lock([filepath], async () => {
            await fsp.rm(filepath, { recursive: true, force: true })
        })
    }

    /**
     * Checks if a file or directory exists.
     * @param target Path to check.
     * @returns True if the target exists, false otherwise.
     */
    async exists(target: string) {
        const filepath = path.join(this.data_path, target)
        return await this._file_locker.with_read_lock([filepath], async () => {
            await fsp.stat(filepath)
            return true
        }).catch(() => false)
    }

    /**
     * Lists files in a directory.
     * @param dir Directory to list files from.
     * @returns Array of file descriptions.
     */
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

    /**
     * Removes a directory.
     * @param dir Directory to remove.
     */
    async rmdir(dir: string) {
        const filepath = path.join(this.data_path, dir)
        return this._file_locker.with_write_lock([filepath], async () => {
            await fsp.rm(filepath, { recursive: true, force: true })
        })
    }

    /**
     * Creates a directory.
     * @param dir Directory to create.
     */
    async mkdir(dir: string) {
        const filepath = path.join(this.data_path, dir)
        return this._file_locker.with_write_lock([filepath], async () => {
            await fsp.mkdir(filepath, { recursive: true })
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

    /**
     * Extracts the type of file or directory.
     * @param d Directory entry to analyze.
     * @returns The file type.
     */
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
