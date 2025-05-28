import { FileDesc, NdcResponse } from '@docker-console/common'
import { Get, HttpFileManager, JsonBody, PathArgs, Post, TpRequest, TpResponse, TpRouter } from '@tarpit/http'
import { Jtl } from '@tarpit/judge'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
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
        const files = await this.file.ls(path.join('data', ...filepath))
        return { status: 'success', data: { files } }
    }

    @Get('zip/:filepath+')
    async zip(args: PathArgs<{ filepath: string[] }>): Promise<ReadableStream> {
        const filepath = args.ensure('filepath', Jtl.array_of(Jtl.non_empty_string))
            .map(p => decodeURIComponent(p))
        return this.file.zip(path.join('data', ...filepath))
    }

    @Get('content/:filepath+')
    async content(args: PathArgs<{ filepath: string[] }>, resp: TpResponse): Promise<ReadableStream> {
        const filepath = args.ensure('filepath', Jtl.array_of(Jtl.non_empty_string))
            .map(p => decodeURIComponent(p))
        const resolved_path = path.join('data', ...filepath)
        const stat = await this.file.lstat(resolved_path)
        resp.set('Content-Length', stat.size)
        return this.file.read_stream(resolved_path)
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
        await this.file.rename(
            path.join('data', ...pre.split('/').filter(Boolean)),
            path.join('data', ...cur.split('/').filter(Boolean)),
        )
        return { status: 'success', data: null }
    }

    @Post()
    async cp(body: JsonBody<{
        pre: string
        cur: string
    }>): Promise<NdcResponse<null>> {
        const pre = body.ensure('pre', Jtl.non_empty_string)
        const cur = body.ensure('cur', Jtl.non_empty_string)
        await this.file.cp(
            path.join('data', ...pre.split('/').filter(Boolean)),
            path.join('data', ...cur.split('/').filter(Boolean)),
        )
        return { status: 'success', data: null }
    }
}
