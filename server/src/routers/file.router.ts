import { NdcResponse } from '@docker-console/common'
import { FileDesc, FileType, Get, HttpFileManager, JsonBody, PathArgs, Post, throw_not_found, TpRequest, TpResponse, TpRouter } from '@tarpit/http'
import { Jtl } from '@tarpit/judge'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import * as unzipper from 'unzipper'
import package_json from '../pkg.json'

@TpRouter('/ndc_api/file')
export class FileRouter {

    constructor(
        private file: HttpFileManager,
    ) {
    }

    @Post()
    async version() {
        return { status: 'success', data: { version: package_json.version } }
    }

    @Get('ls/:filepath*')
    async ls(args: PathArgs<{ filepath: string[] }>): Promise<NdcResponse<{ files: FileDesc[] }>> {
        const filepath = (args.get('filepath') ?? []).map(p => decodeURIComponent(p))
        const resolved_path = path.join('data', ...filepath)
        if (!await this.file.exists(resolved_path)) {
            return throw_not_found()
        }
        const files = await this.file.ls(resolved_path)
        return { status: 'success', data: { files } }
    }

    @Get('lstat/:filepath*')
    async lstat(args: PathArgs<{ filepath: string[] }>) {
        const filepath = (args.get('filepath') ?? []).map(p => decodeURIComponent(p))
        const resolved_path = path.join('data', ...filepath)
        if (!await this.file.exists(resolved_path)) {
            return throw_not_found()
        }
        const stats = await this.file.lstat(resolved_path)
        return { status: 'success', data: { stats, type: this.extract_type(stats) } }
    }

    @Get('zip/:filepath+')
    async zip(args: PathArgs<{ filepath: string[] }>): Promise<ReadableStream> {
        const filepath = args.ensure('filepath', Jtl.array_of(Jtl.non_empty_string))
            .map(p => decodeURIComponent(p))
        const resolved_path = path.join('data', ...filepath)
        if (!await this.file.exists(resolved_path)) {
            throw_not_found()
        }
        return this.file.zip(resolved_path)
    }

    @Get('content/:filepath+')
    async content(args: PathArgs<{ filepath: string[] }>, resp: TpResponse): Promise<ReadableStream> {
        const filepath = args.ensure('filepath', Jtl.array_of(Jtl.non_empty_string))
            .map(p => decodeURIComponent(p))
        const resolved_path = path.join('data', ...filepath)
        if (!await this.file.exists(resolved_path)) {
            throw_not_found()
        }
        const stat = await this.file.lstat(resolved_path)
        resp.set('Content-Length', stat.size)
        return this.file.read_stream(resolved_path)
    }

    @Post('upload/:filepath*')
    async upload(args: PathArgs<{ filepath: string[] }>, request: TpRequest): Promise<NdcResponse<null>> {
        const filepath = (args.get('filepath') ?? []).map(p => decodeURIComponent(p))
        const resolved_path = path.join('data', ...filepath)

        if (!await this.file.exists(resolved_path)) {
            await this.file.mkdir(resolved_path)
        }

        const temp_zip_path = `tmp/${randomUUID()}.zip`
        try {
            await this.file.write_stream(temp_zip_path, request.req)

            const data_path = this.file.data_path
            const zip_path = path.join(data_path, temp_zip_path)
            const target_dir = path.join(data_path, resolved_path)
            const directory = await unzipper.Open.file(zip_path)
            await Promise.allSettled(directory.files.map(async file => {
                const normalized_path = path.normalize(file.path)
                const target_path = path.join(target_dir, normalized_path)

                if (!target_path.startsWith(target_dir + path.sep)) {
                    return
                }

                if (file.type === 'Directory') {
                    await fsp.mkdir(target_path, { recursive: true })
                } else {
                    await fsp.mkdir(path.dirname(target_path), { recursive: true })
                    await pipeline(file.stream(), fs.createWriteStream(target_path))
                }
            }))

            await this.file.rm(temp_zip_path)
        } catch (err: any) {
            await this.file.rm(temp_zip_path).catch(() => void 0)
            return { status: 'error', code: err.code || 500, message: err.message }
        }

        return { status: 'success', data: null }
    }

    @Post('write/:filepath+')
    async write(args: PathArgs<{ filepath: string[] }>, request: TpRequest): Promise<NdcResponse<null>> {
        const filepath = args.ensure('filepath', Jtl.array_of(Jtl.non_empty_string))
            .map(p => decodeURIComponent(p))
        const resolved_path = path.join('data', ...filepath)
        const temp_relative_path = `tmp/${randomUUID()}.tmp`
        try {
            await this.file.write_stream(temp_relative_path, request.req)
            await this.file.rename(temp_relative_path, resolved_path)
        } catch (err: any) {
            await this.file.rm(temp_relative_path).catch(err => err)
            return { status: 'error', code: err.code, message: err.message }
        }
        return { status: 'success', data: null }
    }

    @Post('mkdir/:filepath+')
    async mkdir(args: PathArgs<{ filepath: string[] }>): Promise<NdcResponse<null>> {
        const filepath = args.ensure('filepath', Jtl.array_of(Jtl.non_empty_string))
            .map(p => decodeURIComponent(p))
        const resolved_path = path.join('data', ...filepath)
        await this.file.mkdir(resolved_path)
        return { status: 'success', data: null }
    }

    @Post('rm/:filepath+')
    async rm(args: PathArgs<{ filepath: string[] }>): Promise<NdcResponse<null>> {
        const filepath = args.ensure('filepath', Jtl.array_of(Jtl.non_empty_string))
            .map(p => decodeURIComponent(p))
        const resolved_path = path.join('data', ...filepath)
        await this.file.rm(resolved_path)
        return { status: 'success', data: null }
    }

    @Post()
    async rename(body: JsonBody<{
        pre: string
        cur: string
    }>): Promise<NdcResponse<null>> {
        const pre = body.ensure('pre', Jtl.non_empty_string)
        const cur = body.ensure('cur', Jtl.non_empty_string)
        const resolved_pre = path.join('data', ...pre.split('/').filter(Boolean))
        if (!await this.file.exists(resolved_pre)) {
            throw_not_found()
        }
        await this.file.rename(resolved_pre, path.join('data', ...cur.split('/').filter(Boolean)))
        return { status: 'success', data: null }
    }

    @Post()
    async cp(body: JsonBody<{
        pre: string
        cur: string
    }>): Promise<NdcResponse<null>> {
        const pre = body.ensure('pre', Jtl.non_empty_string)
        const cur = body.ensure('cur', Jtl.non_empty_string)
        const resolved_pre = path.join('data', ...pre.split('/').filter(Boolean))
        if (!await this.file.exists(resolved_pre)) {
            throw_not_found()
        }
        await this.file.cp(resolved_pre, path.join('data', ...cur.split('/').filter(Boolean)))
        return { status: 'success', data: null }
    }

    private extract_type(d: fs.Dirent | fs.Stats): FileType {
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
