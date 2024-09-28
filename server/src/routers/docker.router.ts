import { DockerApi, NdcResponse } from '@docker-console/common'
import { JsonBody, Params, Post, throw_bad_request, TpRouter, TpWebSocket, WS } from '@tarpit/http'
import { Jtl } from '@tarpit/judge'
import axios from 'axios'
import { bufferTime, catchError, filter, finalize, fromEvent, map, merge, mergeMap, of, retry, switchMap, takeUntil, tap } from 'rxjs'
import { DockerService } from '../services/docker.service'
import { DownloadService } from '../services/download.service'

@TpRouter('/ndc_api/docker')
export class DockerRouter {

    constructor(
        private _docker: DockerService,
        private pulling_service: DownloadService,
    ) {
    }

    @Post()
    async pull(body: JsonBody<{
        tag: string
    }>): Promise<NdcResponse<null>> {
        if (!this._docker.health) {
            return { status: 'error', code: 1, message: 'Docker Engine is not running' }
        }
        const tag = body.ensure('tag', Jtl.non_empty_string)
        this.pulling_service.create_pulling_task(tag)
        return { status: 'success', data: null }
    }

    @Post()
    async refresh_pull(): Promise<NdcResponse<null>> {
        this.pulling_service.refresh_pulling$.next(null)
        return { status: 'success', data: null }
    }

    @Post()
    async stop_pull(): Promise<NdcResponse<null>> {
        this.pulling_service.stop_pulling$.next(null)
        return { status: 'success', data: null }
    }

    @Post()
    async resize_exec(body: JsonBody<{
        id: string
        h: number
        w: number
    }>): Promise<NdcResponse<null>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const h = body.ensure('h', Jtl.number)
        const w = body.ensure('w', Jtl.number)
        await this._docker.resize_exec(id, { h, w })
        return { status: 'success', data: null }
    }

    @Post()
    async inspect_exec(body: JsonBody<{
        id: string
    }>): Promise<NdcResponse<DockerApi.ExecDetail>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const exec_detail = await this._docker.inspect_exec(id)
        return { status: 'success', data: exec_detail }
    }

    @Post()
    async create_exec(body: JsonBody<{
        id: string
        options: DockerApi.ExecCreateParameters
    }>): Promise<NdcResponse<{ id: string }>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const options = body.get_if('options', Jtl.exist, {} as DockerApi.ExecCreateParameters)
        const exec_result = await this._docker.create_exec(id, options)
        return { status: 'success', data: { id: exec_result.Id } }
    }

    @Post()
    async create_exec_as_bash(body: JsonBody<{
        id: string
    }>): Promise<NdcResponse<{ id: string }>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        await this._docker.copy_to_container(id, './ndc/assets/.bashrc', '/tmp')
        const exec_res = await this._docker.create_exec(id, {
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            DetachKeys: 'ctrl-j,ctrl-k', // 10, 11
            Tty: true,
            Cmd: ['bash', '--rcfile', `/tmp/.bashrc`, '-i'],
        })
        return { status: 'success', data: { id: exec_res.Id } }
    }

    @WS()
    async start_exec(
        ws: TpWebSocket,
        params: Params<{
            id: string
        }>
    ) {
        const id = params.ensure('id', Jtl.non_empty_string)
        const socket = await this._docker.start_exec(id)
        socket.on('data', data => ws.send(data.toString()))
        ws.on('message', (data: any) => socket.write(data))
        ws.on('close', () => {
            if (!socket.closed) {
                logger.info('exec closed by client, write eof')
                socket.write(Buffer.from([10, 11]))
            }
        })
        socket.once('end', () => {
            logger.info('exec connection closed')
            ws.close()
        })
    }

    @WS()
    async pull_progress(
        ws: TpWebSocket
    ) {
        merge(
            this.pulling_service.progress_event$.pipe(
                map(data => JSON.stringify({ type: 'progress', data: data ?? null })),
            ),
            this.pulling_service.queue_event$.pipe(
                map(data => JSON.stringify({ type: 'queue', data: data ?? null })),
            ),
        ).pipe(
            tap(msg => ws.send(msg)),
            catchError(err => {
                logger.error('pull progress error', err)
                return of(err)
            }),
            takeUntil(fromEvent(ws, 'close')),
            takeUntil(fromEvent(ws, 'error')),
        ).subscribe()
    }

    @WS()
    async subscribe_containers(
        ws: TpWebSocket
    ) {
        this._docker.containers$.pipe(
            map(data => JSON.stringify(data)),
            tap(msg => ws.send(msg)),
            takeUntil(fromEvent(ws, 'close')),
            takeUntil(fromEvent(ws, 'error')),
        ).subscribe()
    }

    @WS()
    async subscribe_networks(
        ws: TpWebSocket
    ) {
        this._docker.networks$.pipe(
            map(data => JSON.stringify(data)),
            tap(msg => ws.send(msg)),
            takeUntil(fromEvent(ws, 'close')),
            takeUntil(fromEvent(ws, 'error')),
        ).subscribe()
    }

    @WS()
    async subscribe_volumes(
        ws: TpWebSocket
    ) {
        this._docker.volumes$.pipe(
            map(data => JSON.stringify(data)),
            tap(msg => ws.send(msg)),
            takeUntil(fromEvent(ws, 'close')),
            takeUntil(fromEvent(ws, 'error')),
        ).subscribe()
    }

    @WS()
    async subscribe_images(
        ws: TpWebSocket
    ) {
        this._docker.images$.pipe(
            map(data => JSON.stringify(data)),
            tap(msg => ws.send(msg)),
            takeUntil(fromEvent(ws, 'close')),
            takeUntil(fromEvent(ws, 'error')),
        ).subscribe()
    }

    @WS()
    async logs(
        ws: TpWebSocket,
        params: Params<{
            id: string
            tail: string
        }>
    ) {
        const id = params.get_first('id')
        const tail = params.get_first('tail') || '200'
        if (!id) {
            throw_bad_request('must provide "id"')
        }
        const info = await this._docker.inspect_container(id)
        if (!info.Id) {
            throw_bad_request('container not found')
        }
        const slice_head = !info.Config.Tty
        const controller = new AbortController
        let buffer = Buffer.from([])
        of(null).pipe(
            switchMap(() => axios.get(`${this._docker.base_url}/containers/${id}/logs`, {
                params: { follow: 'true', stdout: 'true', stderr: 'true', tail, since: 0, timestamps: 'false' },
                responseType: 'stream',
                signal: controller.signal,
                socketPath: '/var/run/docker.sock',
            }).catch(err => {
                logger.debug('axios err %O', err)
                logger.debug('axios err response %O', err.response)
                return null
            })),
            filter(res => !!res),
            switchMap(res => {
                return merge(
                    fromEvent<Buffer>(res.data!, 'data'),
                    fromEvent(res.data!, 'error').pipe(
                        switchMap(err => {
                            throw err
                        })
                    ),
                ).pipe(
                    takeUntil(fromEvent(res.data!, 'end')),
                    finalize(() => res.data!.close()),
                )
            }),
            bufferTime(200),
            filter(arr => !!arr.length),
            mergeMap((arr: Buffer[]) => {
                if (slice_head) {
                    buffer = Buffer.concat([buffer, ...arr])
                    const msg_arr: string[] = []
                    while (true) {
                        const head_index = buffer.indexOf(Buffer.from([0, 0, 0]))
                        if (head_index < 0) {
                            break
                        }
                        if (buffer.byteLength < head_index + 7) {
                            break
                        }
                        const size = buffer.readUInt32BE(head_index + 3)
                        const body_index = head_index + 7
                        if (buffer.byteLength < body_index + size) {
                            break
                        }
                        msg_arr.push(buffer.toString('utf-8', body_index, body_index + size))
                        buffer = buffer.subarray(body_index + size)
                    }
                    return of(msg_arr)
                } else {
                    return of(arr.map(b => b.toString()))
                }
            }, 1),
            tap(msg => ws.send(msg.join('').replace(/\x1b\[[0-9;]+m/g, ''))),
            catchError(err => {
                logger.debug(`Error on logging container %s %O`, id, err)
                throw err
            }),
            retry({ delay: 1000 }),
            takeUntil(fromEvent(ws, 'close')),
            takeUntil(fromEvent(ws, 'error')),
            finalize(() => controller.abort())
        ).subscribe()
    }

    @Post()
    async cancel_pull(): Promise<NdcResponse<null>> {
        return { status: 'success', data: null }
    }

    @Post()
    async inspect_image(body: JsonBody<{
        name: string
    }>): Promise<NdcResponse<DockerApi.ImageDetail>> {
        const name = body.ensure('name', Jtl.non_empty_string)
        const data = await this._docker.inspect_image(name)
        if (data.Id !== undefined) {
            return { status: 'success', data }
        } else {
            return { status: 'error', code: 1, message: data.message }
        }
    }

    @Post()
    async list_images(): Promise<NdcResponse<DockerApi.ImageOverview[]>> {
        const data = await this._docker.list_images()
        return { status: 'success', data }
    }

    @Post()
    async delete_image(body: JsonBody<{
        id: string
    }>): Promise<NdcResponse<{ Untagged: string, Deleted: string }[]>> {
        const name_or_id = body.ensure('id', Jtl.non_empty_string)
        const data = await this._docker.remove_image(name_or_id)
        return { status: 'success', data }
    }

    @Post()
    async list_containers(body: JsonBody<{
        all?: boolean
        limit?: number
        size?: boolean
        filters?: DockerApi.ContainerFilter
    }>): Promise<NdcResponse<DockerApi.ContainerOverview[]>> {
        const all = body.get_if('all', Jtl.boolean)
        const limit = body.get_if('limit', Jtl.number)
        const size = body.get_if('size', Jtl.boolean)
        const filters = body.get_if('filters', Jtl.object)
        const data = await this._docker.list_containers({ all, limit, size, filters })
        return { status: 'success', data }
    }

    @Post()
    async inspect_container(body: JsonBody<{ id: string }>): Promise<NdcResponse<DockerApi.ContainerDetail>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const data = await this._docker.inspect_container(id)
        if (data.Id !== undefined) {
            return { status: 'success', data }
        } else {
            return { status: 'error', code: 1, message: data.message }
        }
    }

    @Post()
    async restart_container(body: JsonBody<{
        id: string
    }>): Promise<NdcResponse<null>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const data = await this._docker.restart_container(id)
        return { status: 'success', data }
    }

    @Post()
    async start_container(body: JsonBody<{
        id: string
    }>): Promise<NdcResponse<null>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const data = await this._docker.start_container(id)
        return { status: 'success', data }
    }

    @Post()
    async stop_container(body: JsonBody<{
        id: string
    }>): Promise<NdcResponse<null>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const data = await this._docker.stop_container(id)
        return { status: 'success', data }
    }

    @Post()
    async delete_container(body: JsonBody<{
        id: string
    }>): Promise<NdcResponse<null>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const data = await this._docker.delete_container(id)
        return { status: 'success', data }
    }

    @Post()
    async inspect_network(body: JsonBody<{
        id: string,
        options?: { verbose?: boolean, scope?: string }
    }>): Promise<NdcResponse<DockerApi.NetworkDetail>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const data = await this._docker.inspect_network(id)
        if (data.Id !== undefined) {
            return { status: 'success', data }
        } else {
            return { status: 'error', code: 1, message: data.message }
        }
    }

    @Post()
    async create_network(body: JsonBody<{
        params: DockerApi.NetworkCreateParameters
    }>): Promise<NdcResponse<{ Id: string, Warning: string }>> {
        const params = body.ensure('params', Jtl.exist)
        const data = await this._docker.create_network(params)
        return { status: 'success', data }
    }

    @Post()
    async connect_network(body: JsonBody<{
        id: string
        container: string
        endpoint_config?: DockerApi.NetworkEndpointConfig
    }>): Promise<NdcResponse<null>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const Container = body.get_if('container', Jtl.non_empty_string)
        const EndpointConfig = body.get_if('endpoint_config', Jtl.object)
        const data = await this._docker.connect_network(id, { Container, EndpointConfig })
        return { status: 'success', data }
    }

    @Post()
    async disconnect_network(body: JsonBody<{
        id: string
        container?: string
        force?: boolean
    }>): Promise<NdcResponse<null>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const Container = body.get_if('container', Jtl.non_empty_string)
        const Force = body.get_if('force', Jtl.boolean)
        const data = await this._docker.disconnect_network(id, { Container, Force })
        return { status: 'success', data }
    }

    @Post()
    async list_networks(body: JsonBody<{
        filters?: DockerApi.NetworkFilter
    }>): Promise<NdcResponse<DockerApi.NetworkDetail[]>> {
        const filters = body.get_if('filters', Jtl.exist)
        const data = await this._docker.list_networks(filters)
        return { status: 'success', data }
    }

    @Post()
    async prune_networks(body: JsonBody<{
        filters?: { until?: string | number, label?: string[] }
    }>): Promise<NdcResponse<{ NetworksDeleted: string[] }>> {
        const filters = body.get_if('filters', Jtl.exist)
        const data = await this._docker.prune_networks(filters)
        return { status: 'success', data }
    }

    @Post()
    async delete_network(body: JsonBody<{
        id: string
    }>): Promise<NdcResponse<null>> {
        const name_or_id = body.ensure('id', Jtl.non_empty_string)
        const data = await this._docker.remove_network(name_or_id)
        return { status: 'success', data }
    }

    @Post()
    async create_volume(body: JsonBody<{
        params: DockerApi.VolumeCreateParameters
    }>): Promise<NdcResponse<DockerApi.VolumeDetail>> {
        const params = body.ensure('params', Jtl.exist)
        const data = await this._docker.create_volume(params)
        return { status: 'success', data }
    }

    @Post()
    async inspect_volume(body: JsonBody<{
        id: string
        options?: { verbose?: boolean, scope?: string }
    }>): Promise<NdcResponse<DockerApi.VolumeDetail>> {
        const id = body.ensure('id', Jtl.non_empty_string)
        const data = await this._docker.inspect_volume(id)
        return { status: 'success', data }
    }

    @Post()
    async list_volumes(body: JsonBody<{
        filters?: DockerApi.VolumeFilter
    }>): Promise<NdcResponse<{ Volumes: DockerApi.VolumeDetail[], Warnings: string[] }>> {
        const filters = body.get_if('filters', Jtl.exist)
        const data = await this._docker.list_volumes(filters)
        return { status: 'success', data }
    }

    @Post()
    async prune_volumes(body: JsonBody<{
        filters?: { label?: string[] }
    }>): Promise<NdcResponse<{ VolumesDeleted: string[], SpaceReclaimed: number }>> {
        const filters = body.get_if('filters', Jtl.exist)
        const data = await this._docker.prune_volumes(filters)
        return { status: 'success', data }
    }

    @Post()
    async delete_volume(body: JsonBody<{
        id: string
        force?: boolean
    }>): Promise<NdcResponse<null>> {
        const name_or_id = body.ensure('id', Jtl.non_empty_string)
        const force = body.get_if('force', Jtl.boolean)
        const data = await this._docker.remove_volume(name_or_id, force)
        return { status: 'success', data }
    }
}
