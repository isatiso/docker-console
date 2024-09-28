import { NdcResponse } from '@docker-console/common'
import { JsonBody, Post, throw_forbidden, throw_not_found, TpRouter } from '@tarpit/http'
import { Jtl } from '@tarpit/judge'
import package_json from '../pkg.json'
import { NdcFileService } from '../services/file.service'
import { ManagerService } from '../services/manager.service'

@TpRouter('/ndc_api/service')
export class ServiceRouter {

    constructor(
        private file: NdcFileService,
        private manager: ManagerService,
    ) {
    }

    @Post()
    async version(): Promise<NdcResponse<{ version: string }>> {
        return { status: 'success', data: { version: package_json.version } }
    }

    @Post()
    async project_up(body: JsonBody<{ name: string }>): Promise<NdcResponse<{ result?: boolean }>> {
        const name = body.ensure('name', Jtl.non_empty_string)
        if (!this.file.projects[name]) {
            throw_not_found(`Project ${name} not found`)
        }
        if (!this.file.projects[name].valid) {
            throw_forbidden(`The definition of project ${name} is invalid`)
        }
        const res = await new Promise<boolean | undefined>((resolve, reject) => {
            this.manager.project_up$.next({ name, reject, resolve })
        })
        return { status: 'success', data: { result: res } }
    }

    @Post()
    async project_down(body: JsonBody<{ name: string }>): Promise<NdcResponse<{ result?: boolean }>> {
        const name = body.ensure('name', Jtl.non_empty_string)
        if (!this.file.projects[name]) {
            throw_not_found(`Project ${name} not found`)
        }
        if (!this.file.projects[name].valid) {
            throw_forbidden(`The definition of project ${name} is invalid`)
        }
        const res = await new Promise<boolean | undefined>((resolve, reject) => {
            this.manager.project_down$.next({ name, reject, resolve })
        })
        return { status: 'success', data: { result: res } }
    }
}
