import { TpService } from '@tarpit/core'
import { HttpContext, HttpHooks, TpRequest, TpWebSocket } from '@tarpit/http'

function assemble_duration(context: HttpContext) {
    const start = context.get('process_start')
    const duration = start ? Date.now() - start : -1
    context.response.set('X-Duration', duration)
    return duration
}

@TpService({ inject_root: true })
export class NdcHttpHooks extends HttpHooks {

    constructor() {
        super()
    }

    private async write_request_log(ip: string, duration: string, method: string, status: string, path: string, err_msg: string = '') {
        path = decodeURIComponent(path)
        if (path.startsWith('/ndc_')) {
            logger.info(' %s %s %s %s %s %s', ip.padEnd(18), duration.padStart(8), method.padEnd(7), status.padEnd(6), path, err_msg)
        } else {
            logger.debug('%s %s %s %s %s %s', ip.padEnd(18), duration.padStart(8), method.padEnd(7), status.padEnd(6), path, err_msg)
        }
    }

    async write_request_log_by_context(context: HttpContext) {
        const duration = assemble_duration(context)
        const err_msg = context.response.status >= 400 ? `<${context.result.code} ${context.result.msg}>` : ''
        await this.write_request_log(context.request.ip, `${duration}ms`, context.request.method ?? '-', context.response.status + '', context.request.path ?? '-', err_msg)
        if (context.response.status === 500) {
            logger.error(`%O`, context.result.origin)
            logger.debug(`%O`, context.result.stack)
        }
    }

    override async on_init(context: HttpContext): Promise<void> {
        context.set('process_start', Date.now())
    }

    override async on_finish(context: HttpContext): Promise<void> {
        if (context.request.path?.startsWith('/connect/')) {
            return
        }
        await this.write_request_log_by_context(context)
    }

    override async on_error(context: HttpContext): Promise<void> {
        await this.write_request_log_by_context(context)
    }

    override async on_ws_init(socket: TpWebSocket, req: TpRequest): Promise<void> {
        await this.write_request_log(req.ip, 'OPEN', 'SOCKET', '-', req.path ?? '-')
    }

    override async on_ws_close(socket: TpWebSocket, req: TpRequest, code: number): Promise<void> {
        await this.write_request_log(req.ip, 'CLOSE', 'SOCKET', code + '', req.path ?? '-')
    }
}
