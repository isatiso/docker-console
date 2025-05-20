import { NdcResponse } from '@docker-console/common'
import { TpConfigData } from '@tarpit/core'
import { JsonBody, Params, Post, TpRouter, TpWebSocket, WS } from '@tarpit/http'
import { Jtl } from '@tarpit/judge'
import * as pty from 'node-pty'
import path from 'node:path'

@TpRouter('/ndc_api/pty')
export class PtyRouter {

    private _pty_map: Record<string, pty.IPty> = {}
    private _data_path = this._config.get('ndc.data_path')
    private _log_file = path.join(this._data_path, 'log', 'docker-console.log')

    constructor(
        private _config: TpConfigData,
    ) {
    }

    @WS()
    async create(
        ws: TpWebSocket,
        params: Params<{
            id: string
            type?: 'shell' | 'log'
            rows: string
            cols: string
        }>,
    ) {
        const id = params.ensure('id', Jtl.non_empty_string)
        const type = params.get_first('type', /^(shell|log)$/) || 'shell'
        const rows = +params.ensure('rows', /^[0-9]+$/)
        const cols = +params.ensure('cols', /^[0-9]+$/)
        let pty_ins: pty.IPty
        if (type === 'shell') {
            pty_ins = pty.spawn(process.env.SHELL ?? 'sh', [], { name: 'xterm-color', cols, rows, cwd: process.cwd(), env: process.env })
        } else {
            pty_ins = pty.spawn('tail', ['-f', '-n', '200', this._log_file], { name: 'xterm-color', cols, rows, cwd: process.cwd(), env: process.env })
        }
        this._pty_map[id] = pty_ins
        pty_ins.onExit(() => {
            delete this._pty_map[id]
            ws.close()
        })
        pty_ins.onData(data => ws.send(data))
        ws.on('message', (data: any) => pty_ins.write(data))
        ws.on('close', () => {
            pty_ins.kill()
        })
    }

    @Post()
    async resize(body: JsonBody<{
        id: string
        rows: number
        cols: number
    }>): Promise<NdcResponse<null>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const rows = body.ensure('rows', Jtl.number)
        const cols = body.ensure('cols', Jtl.number)
        this._pty_map[id]?.resize(cols, rows)
        return { status: 'success', data: null }
    }
}
