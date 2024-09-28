import { Get, HttpStatic, TpRequest, TpResponse, TpRouter } from '@tarpit/http'

@TpRouter('/', {})
export class StaticRouter {

    constructor(
        private http_static: HttpStatic,
    ) {
    }

    @Get('')
    async index(req: TpRequest, res: TpResponse) {
        return this.http_static.serve(req, res, { path: 'index.html' })
    }

    @Get(':path+')
    async assets(req: TpRequest, res: TpResponse) {
        try {
            return await this.http_static.serve(req, res, { path: req.path ?? '' })
        } catch (e) {
        }
        return this.http_static.serve(req, res, { path: 'index.html' })
    }
}
