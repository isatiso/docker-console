import { DockerApi, DockerDef, LABEL } from '@docker-console/common'
import { TpService } from '@tarpit/core'
import { catchError, of, Subject, switchMap, tap } from 'rxjs'
import { network_def_to_parameters, service_def_to_parameters, volume_def_to_parameters } from '../helpers/docker-helpers'
import package_json from '../pkg.json'
import { DockerService } from './docker.service'
import { DownloadService } from './download.service'
import { NdcFileService } from './file.service'

@TpService()
export class ManagerService {

    project_up$ = new Subject<{ name: string, resolve: (value?: boolean) => void, reject: (reason?: any) => void }>()
    project_down$ = new Subject<{ name: string, resolve: (value?: boolean) => void, reject: (reason?: any) => void }>()

    constructor(
        private file: NdcFileService,
        private docker: DockerService,
        private pulling_service: DownloadService,
    ) {
        this.project_up$.pipe(
            switchMap(({ name, resolve, reject }) => of(null).pipe(
                switchMap(() => this.project_up(name)),
                tap(result => resolve(result)),
                catchError(err => of(err)),
                tap(err => reject(err)),
            )),
        ).subscribe()
        this.project_down$.pipe(
            switchMap(({ name, resolve, reject }) => of(null).pipe(
                switchMap(() => this.project_down(name)),
                tap(result => resolve(result)),
                catchError(err => of(err)),
                tap(err => reject(err)),
            )),
        ).subscribe()
    }

    async project_up(project_name: string) {
        const { project, services, volumes, networks } = this.preprocess_project_parameters(project_name)

        const images = Object.values(project.def.services).map(s => s.image)
        logger.info('check all images of project %s, start pulling...', project_name)
        try {
            await Promise.all(images.map(img => this.pulling_service.create_pulling_task(img).promise))
            logger.info('all images of project %s are pulled', project_name)
        } catch (err: any) {
            logger.error('failed to pull images of project %s due to %O', project_name, err)
            throw err
        }

        for (const [reference_name, network_def] of Object.entries(networks)) {
            const network_name = network_def.name ?? `${project_name}_${reference_name}`
            const { external, params } = network_def_to_parameters(reference_name, project_name, network_def)
            params.Labels[LABEL.Network] = reference_name
            params.Labels[LABEL.Project] = project_name
            params.Labels[LABEL.Version] = package_json.version
            const exists_network = await this.docker.list_networks({ name: [network_name] })
            if (!exists_network.length) {
                if (external) {
                    throw new Error(`External network ${network_name} not found`)
                } else {
                    await this.docker.create_network(params)
                }
            }
        }

        for (const [reference_name, volume_def] of Object.entries(volumes)) {
            const volume_name = volume_def.name ?? `${project_name}_${reference_name}`
            const { external, params } = volume_def_to_parameters(reference_name, project_name, volume_def)
            params.Labels[LABEL.Volume] = reference_name
            params.Labels[LABEL.Project] = project_name
            params.Labels[LABEL.Version] = package_json.version
            const exists_volume = await this.docker.list_volumes({ name: [volume_name] })
            if (!exists_volume.Volumes.length) {
                if (external) {
                    throw new Error(`External volume ${volume_name} not found`)
                } else {
                    await this.docker.create_volume(params)
                }
            }
        }

        for (const { name, platform, replicas, params } of services) {
            const service_name = `${project_name}-${name}`
            const image_info = await this.docker.inspect_image(params.Image)
            params.Labels[LABEL.Service] = name
            params.Labels[LABEL.Project] = project_name
            params.Labels[LABEL.Version] = package_json.version
            params.Labels[LABEL.image] = image_info.Id ? image_info.Id : ''
            params.HostConfig.Binds = params.HostConfig.Binds ?? []
            if (process.env.NDC_DATA_PATH) {
                params.HostConfig.Binds.push(`${process.env.NDC_DATA_PATH}:/docker-console:rw`)
            }
            for (let i = 1; i <= replicas; i++) {
                const container_name = `${service_name}-${i}`
                const custom_params = { ...params }
                custom_params.Labels[LABEL.ContainerNumber] = i + ''
                const exists_container = await this.docker.inspect_container(container_name)
                if (exists_container.Id) {
                    if (exists_container.Config.Labels?.[LABEL.ConfigHash] !== params.Labels[LABEL.ConfigHash]) {
                        if (exists_container.State?.Status === 'running' || exists_container.State?.Status === 'restarting') {
                            await this.docker.stop_container(exists_container.Id)
                        }
                        await this.docker.delete_container(exists_container.Id)
                    } else {
                        continue
                    }
                }
                const endpoint_config: Record<string, DockerApi.NetworkEndpointConfig> = {}
                for (const [network_name, config] of Object.entries(params.NetworkingConfig!.EndpointsConfig)) {
                    const new_config = { ...config }
                    new_config.Aliases = new_config.Aliases ?? []
                    new_config.Aliases.push(name)
                    new_config.Aliases.push(container_name)
                    endpoint_config[network_name] = new_config
                }
                custom_params.NetworkingConfig = { EndpointsConfig: endpoint_config }
                const create_result = await this.docker.create_container({ name: container_name, platform, params: custom_params })
                await this.docker.start_container(create_result.Id)
            }
        }
        return true
    }

    async project_down(project_name: string) {
        const { services, networks } = this.preprocess_project_parameters(project_name)
        for (const { name } of services) {
            logger.debug('stop and delete containers of service %s in project %s', name, project_name)
            const exists_containers: DockerApi.ContainerOverview[] = await this.docker.list_containers({
                all: true, filters: { label: [`${LABEL.Project}=${project_name}`, `${LABEL.Service}=${name}`] }
            })
            for (const info of exists_containers) {
                logger.debug('stop and delete container %s in project %s', info.Names[0], project_name)
                if (info.State === 'running' || info.State === 'restarting') {
                    await this.docker.stop_container(info.Id)
                }
                await this.docker.delete_container(info.Id)
            }
        }
        for (const [reference_name, network_def] of Object.entries(networks)) {
            logger.debug('delete network %s in project %s', reference_name, project_name)
            const network_name = network_def.name ?? `${project_name}_${reference_name}`
            if (!network_def.external) {
                const exists_network = await this.docker.list_networks({ name: [network_name] })
                if (exists_network.length) {
                    await this.docker.remove_network(network_name)
                }
            }
        }
        return true
    }

    private preprocess_project_parameters(project_name: string) {
        const project = this.file.projects[project_name]
        if (!project) {
            throw new Error(`Project ${project_name} not found`)
        }
        if (!project.valid) {
            throw new Error(`The definition of project ${project_name} is invalid`)
        }

        const referenced_networks: Record<string, DockerDef.DefinitionsNetwork> = {}
        const referenced_volumes: Record<string, DockerDef.DefinitionsVolume> = {}
        const services = Object.entries(project.def.services)
            .map(([service_name, service]) => {
                const { volumes, networks, ...services } = service_def_to_parameters(
                    service_name,
                    project_name,
                    service,
                    project.def.volumes ?? {},
                    project.def.networks ?? {},
                )
                Object.assign(referenced_networks, networks)
                Object.assign(referenced_volumes, volumes)
                return services
            })

        return {
            project,
            volumes: referenced_volumes,
            networks: referenced_networks,
            services
        }
    }
}
