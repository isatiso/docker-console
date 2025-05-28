import { DockerDef, NdcResponse } from '@docker-console/common'
import { HttpFileManager, JsonBody, Post, TpRouter } from '@tarpit/http'
import { Jtl } from '@tarpit/judge'
import path from 'node:path'
import { NdcProjectService } from '../services/project.service'

@TpRouter('/ndc_api/projects')
export class FileRouter {

    constructor(
        private file: HttpFileManager,
        private project: NdcProjectService,
    ) {
    }

    @Post()
    async projects(body: JsonBody<{
        reload?: boolean
    }>): Promise<NdcResponse<Record<string, DockerDef.DefinitionStat>>> {
        const reload = body.get_if('reload', Jtl.boolean, false)
        if (reload) {
            await this.project.load()
        }
        return { status: 'success', data: this.project.projects }
    }

    @Post()
    async write_text(body: JsonBody<{
        category?: string
        dir?: string
        filename: string
        content: string
    }>): Promise<NdcResponse<null>> {
        const cat = body.get_if('category', /data|projects/, 'data') as 'projects' | 'data'
        const dir = body.get_if('dir', Jtl.non_empty_string, '/')
        const filename = body.ensure('filename', Jtl.non_empty_string)
        const content = body.ensure('content', Jtl.string)
        await this.file.write(path.join(cat, dir, filename), Buffer.from(content, 'utf8'))
        if (cat === 'projects') {
            await this.project.load(filename.replace(`.project.yml`, ''))
        }
        return { status: 'success', data: null }
    }

    @Post()
    async read_project(body: JsonBody<{
        category?: string
        dir?: string
        filename: string
    }>): Promise<NdcResponse<{ content: string }>> {
        const cat = body.get_if('category', /data|projects/, 'data')
        const dir = body.get_if('dir', Jtl.non_empty_string, '/')
        const filename = body.ensure('filename', Jtl.non_empty_string)
        const content = await this.file.read(path.join(cat, dir, filename))
        return { status: 'success', data: { content: content.toString('utf8') } }
    }

}
