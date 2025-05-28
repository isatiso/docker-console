import { DockerDef, NdcResponse } from '@docker-console/common'
import { Get, HttpFileManager, JsonBody, PathArgs, Post, TpRequest, TpRouter } from '@tarpit/http'
import { Jtl } from '@tarpit/judge'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { NdcProjectService } from '../services/project.service'

@TpRouter('/ndc_api/project')
export class ProjectRouter {

    constructor(
        private file: HttpFileManager,
        private project: NdcProjectService,
    ) {
    }

    @Post()
    async list(): Promise<NdcResponse<Record<string, DockerDef.DefinitionStat>>> {
        return { status: 'success', data: this.project.projects }
    }

    @Post()
    async reload(): Promise<NdcResponse<Record<string, DockerDef.DefinitionStat>>> {
        await this.project.load()
        return { status: 'success', data: this.project.projects }
    }

    @Get('read/:filename')
    async read(args: PathArgs<{ filename: string }>): Promise<string> {
        const filename = args.ensure('filename', Jtl.non_empty_string)
        try {
            const content = await this.file.read(path.join('projects', filename))
            return content.toString('utf8')
        } catch (err: any) {
            return err.message
        }
    }

    @Post('write/:filename')
    async write(args: PathArgs<{ filename: string }>, request: TpRequest): Promise<NdcResponse<null>> {
        const filename = args.ensure('filename', Jtl.non_empty_string)
        const resolved_path = path.join('projects', filename)
        const temp_relative_path = `tmp/${randomUUID()}.tmp`

        try {
            await this.file.write_stream(temp_relative_path, request.req)
            await this.file.rename(temp_relative_path, resolved_path)

            // Reload the specific project if it's a .project.yml file
            if (filename.endsWith('.project.yml')) {
                const project_name = filename.replace('.project.yml', '')
                await this.project.load(project_name)
            }

            return { status: 'success', data: null }
        } catch (err: any) {
            await this.file.rm(temp_relative_path).catch(err => err)
            return { status: 'error', code: 500, message: err.message }
        }
    }

    @Post('rm/:filename')
    async rm(args: PathArgs<{ filename: string }>): Promise<NdcResponse<null>> {
        const filename = args.ensure('filename', Jtl.non_empty_string)

        try {
            await this.file.rm(path.join('projects', filename))

            // Reload projects to update the cache
            await this.project.load()

            return { status: 'success', data: null }
        } catch (err: any) {
            return { status: 'error', code: err.code === 'ENOENT' ? 404 : 500, message: err.message }
        }
    }

    @Post()
    async rename(body: JsonBody<{
        old: string
        to: string
    }>): Promise<NdcResponse<null>> {
        const old = body.ensure('old', Jtl.non_empty_string)
        const to = body.ensure('to', Jtl.non_empty_string)

        // Ensure filenames don't contain path separators (no subdirectories allowed)
        if (old.includes('/') || old.includes('\\') ||
            to.includes('/') || to.includes('\\')) {
            return { status: 'error', code: 400, message: 'Project files cannot be in subdirectories' }
        }

        try {
            await this.file.rename(
                path.join('projects', old),
                path.join('projects', to)
            )

            // Reload projects to update the cache
            await this.project.load()

            return { status: 'success', data: null }
        } catch (err: any) {
            return { status: 'error', code: err.code === 'ENOENT' ? 404 : 500, message: err.message }
        }
    }

    @Post()
    async cp(body: JsonBody<{
        src: string
        dst: string
    }>): Promise<NdcResponse<null>> {
        const src = body.ensure('src', Jtl.non_empty_string)
        const dst = body.ensure('dst', Jtl.non_empty_string)

        // Ensure filenames don't contain path separators (no subdirectories allowed)
        if (src.includes('/') || src.includes('\\') ||
            dst.includes('/') || dst.includes('\\')) {
            return { status: 'error', code: 400, message: 'Project files cannot be in subdirectories' }
        }

        try {
            await this.file.cp(
                path.join('projects', src),
                path.join('projects', dst)
            )

            // Reload the new project if it's a .project.yml file
            if (dst.endsWith('.project.yml')) {
                const project_name = dst.replace('.project.yml', '')
                await this.project.load(project_name)
            }

            return { status: 'success', data: null }
        } catch (err: any) {
            return { status: 'error', code: err.code === 'ENOENT' ? 404 : 500, message: err.message }
        }
    }
}
