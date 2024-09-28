import { DockerDef, FileDesc, NdcResponse } from '@docker-console/common'
import { JsonBody, Post, TpRouter } from '@tarpit/http'
import { Jtl } from '@tarpit/judge'
import path from 'node:path'
import package_json from '../pkg.json'
import { NdcFileService } from '../services/file.service'

@TpRouter('/ndc_api/file')
export class FileRouter {

    constructor(
        private file: NdcFileService,
    ) {
    }

    @Post()
    async version() {
        return { status: 'success', data: { version: package_json.version } }
    }

    @Post()
    async projects(body: JsonBody<{
        reload?: boolean
    }>): Promise<NdcResponse<Record<string, DockerDef.DefinitionStat>>> {
        const reload = body.get_if('reload', Jtl.boolean, false)
        if (reload) {
            await this.file.load_projects()
        }
        return { status: 'success', data: this.file.projects }
    }

    @Post()
    async ls(body: JsonBody<{
        category?: string
        dir?: string
    }>): Promise<NdcResponse<{ files: FileDesc[] }>> {
        const cat = body.get_if('category', /data|projects/, 'data')
        const dir = body.get_if('dir', Jtl.non_empty_string, '/')
        const files = await this.file.ls(path.join(cat, dir))
        return { status: 'success', data: { files } }
    }

    @Post()
    async mkdir(body: JsonBody<{
        category?: string
        dir?: string
        name: string
    }>): Promise<NdcResponse<null>> {
        const cat = body.get_if('category', /data|projects/, 'data')
        const dir = body.get_if('dir', Jtl.non_empty_string, '/')
        const name = body.ensure('name', Jtl.non_empty_string)
        await this.file.mkdir(path.join(cat, dir, name))
        return { status: 'success', data: null }
    }

    @Post()
    async rmdir(body: JsonBody<{
        category?: string
        dir?: string
        dirname: string
    }>): Promise<NdcResponse<null>> {
        const cat = body.get_if('category', /data|projects/, 'data')
        const dir = body.get_if('dir', Jtl.non_empty_string, '/')
        const dirname = body.ensure('dirname', Jtl.non_empty_string)
        await this.file.rmdir(path.join(cat, dir, dirname))
        return { status: 'success', data: null }
    }

    @Post()
    async read(body: JsonBody<{
        category?: string
        dir?: string
        filename: string
    }>): Promise<NdcResponse<{ content: string }>> {
        const cat = body.get_if('category', /data|projects/, 'data')
        const dir = body.get_if('dir', Jtl.non_empty_string, '/')
        const filename = body.ensure('filename', Jtl.non_empty_string)
        const content = await this.file.read(path.join(cat, dir), filename)
        return { status: 'success', data: { content } }
    }

    @Post()
    async write(body: JsonBody<{
        category?: string
        dir?: string
        filename: string
        content: string
    }>): Promise<NdcResponse<null>> {
        const cat = body.get_if('category', /data|projects/, 'data') as 'projects' | 'data'
        const dir = body.get_if('dir', Jtl.non_empty_string, '/')
        const filename = body.ensure('filename', Jtl.non_empty_string)
        const content = body.ensure('content', Jtl.string)
        await this.file.write(path.join(cat, dir), filename, content)
        if (cat === 'projects') {
            await this.file.load_projects(filename.replace(`.project.yml`, ''))
        }
        return { status: 'success', data: null }
    }

    @Post()
    async rename(body: JsonBody<{
        category?: string
        dir?: string
        filename: string
        new_name: string
    }>): Promise<NdcResponse<null>> {
        const cat = body.get_if('category', /data|projects/, 'data') as 'projects' | 'data'
        const dir = body.get_if('dir', Jtl.non_empty_string, '/')
        const filename = body.ensure('filename', Jtl.non_empty_string)
        const new_name = body.ensure('new_name', Jtl.non_empty_string)
        await this.file.rename(path.join(cat, dir), filename, new_name)
        if (cat === 'projects') {
            await this.file.load_projects(filename.replace(`.project.yml`, ''))
            await this.file.load_projects(new_name.replace(`.project.yml`, ''))
        }
        return { status: 'success', data: null }
    }

    @Post()
    async rm(body: JsonBody<{
        category?: string
        dir?: string
        filename: string
    }>): Promise<NdcResponse<null>> {
        const cat = body.get_if('category', /data|projects/, 'data') as 'projects' | 'data'
        const dir = body.get_if('dir', Jtl.non_empty_string, '/')
        const filename = body.ensure('filename', Jtl.non_empty_string)
        await this.file.rm(path.join(cat, dir), filename)
        if (cat === 'projects') {
            await this.file.load_projects(filename.replace(`.project.yml`, ''))
        }
        return { status: 'success', data: null }
    }
}
