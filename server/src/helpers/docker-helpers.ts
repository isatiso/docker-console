import { DockerApi, DockerDef, LABEL } from '@docker-console/common'
import crypto from 'node:crypto'
import ListOrDict = DockerDef.ListOrDict

const DURATION_UNITS: Record<string, number> = {
    us: 1,
    ms: 1000,
    s: 1000000,
    m: 60 * 1000 * 1000,
    h: 60 * 60 * 1000 * 1000,
}

function encode_object(obj: any, prefix?: string, arr?: string[]) {
    arr = arr ?? []
    if (Array.isArray(obj)) {
        prefix = prefix ? prefix : ''
        for (let i = 0; i < obj.length; i++) {
            if (typeof obj[i] === 'string') {
                arr.push(`${prefix}[${i}]=${obj[i]}`)
            } else if (typeof obj[i] === 'number') {
                arr.push(`${prefix}[${i}]=${obj[i]}`)
            } else if (typeof obj[i] === 'boolean') {
                arr.push(`${prefix}[${i}]=${obj[i]}`)
            } else if (obj[i] === null) {
                arr.push(`${prefix}[${i}]=null`)
            } else if (typeof obj[i] !== 'function') {
                encode_object(obj[i], `${prefix}[${i}]`, arr)
            }
        }
        return arr.join('&')
    } else if (typeof obj !== 'function') {
        prefix = prefix ? prefix + '.' : ''
        const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b))
        for (const key of keys) {
            if (typeof obj[key] === 'string') {
                arr.push(`${prefix}${key}="${obj[key]}"`)
            } else if (typeof obj[key] === 'number') {
                arr.push(`${prefix}${key}=${obj[key]}`)
            } else if (typeof obj[key] === 'boolean') {
                arr.push(`${prefix}${key}=${obj[key]}`)
            } else if (obj[key] === null) {
                arr.push(`${prefix}${key}=null`)
            } else if (typeof obj[key] !== 'function') {
                encode_object(obj[key], `${prefix}${key}`, arr)
            }
        }
        return arr.join('&')
    }
    return ''
}

function hash_object(obj: any) {
    return crypto.createHash('md5').update(encode_object(obj)).digest('base64url')
}

export function normalize_dict(src: ListOrDict, reserve_empty?: boolean): Record<string, string> {
    if (Array.isArray(src)) {
        const result: Record<string, string> = {}
        for (const exp of src) {
            const [k, v] = exp.split(/=(.+)/, 2)
            if (v) {
                result[k] = v
                continue
            }
            if (reserve_empty) {
                result[k] = ''
            }
        }
        return result
    } else {
        return Object.fromEntries(Object.entries(src).map(([k, v]) => [k, v ? v + '' : v === false ? v + '' : '']))
    }
}

export function parse_bytes(byte_exp: string | number): number {
    if (typeof byte_exp === 'number') {
        return Math.floor(byte_exp)
    }
    byte_exp = byte_exp.toLowerCase().trim()
    const matches = byte_exp.match(/^(\d+(?:\.\d+)?)(b|kb|k|mb|m|gb|g|)$/)
    if (!matches) {
        throw new Error(`Invalid byte expression: ${byte_exp}`)
    }
    const value = +matches[1]
    switch (matches[2]) {
        case '':
            return Math.floor(value)
        case 'b':
            return Math.floor(value)
        case 'kb':
        case 'k':
            return Math.floor(value * 1024)
        case 'mb':
        case 'm':
            return Math.floor(value * 1024 * 1024)
        case 'gb':
        case 'g':
            return Math.floor(value * 1024 * 1024 * 1024)
        default:
            throw new Error(`Invalid byte expression: ${byte_exp}`)
    }
}

export function parse_duration(duration: string | number): number {
    if (typeof duration === 'number') {
        return duration
    }
    const regex = /(\d+)(us|ms|s|m|h)/g
    let total_microseconds = 0

    let match
    while ((match = regex.exec(duration)) !== null) {
        const value = +match[1]
        const unit = match[2]

        if (DURATION_UNITS[unit]) {
            total_microseconds += value * DURATION_UNITS[unit]
        } else {
            throw new Error(`Unsupported unit: ${unit}`)
        }
    }

    return total_microseconds
}

export function parse_ports(defs: Exclude<DockerDef.DefinitionsService['ports'], undefined>) {
    const ports: Exclude<DockerApi.ContainerCreateParameters['HostConfig'], undefined>['PortBindings'] = {}
    for (const exp of defs) {
        if (typeof exp === 'number') {
            ports[exp + '/tcp'] = [{ HostIp: '', HostPort: '0' }]
        } else if (typeof exp === 'string') {
            const matches = exp.match(/^(?:\[?(.+?[^0-9-].+?)]?:)?(\d+)(?:-(\d+))?(?::(\d+)(?:-(\d+))?)?(?:\/(tcp|udp|sctp))?$/)
            if (!matches) {
                throw new Error(`Invalid port expression: ${exp}`)
            }
            const data = {
                ip: matches[1] || '',
                host_start: matches[4] ? +matches[2] : undefined,
                host_end: matches[4] ? +matches[3] : undefined,
                container_start: !matches[4] ? +matches[2] : +matches[4],
                container_end: !matches[4] ? (matches[3] ? +matches[3] : undefined) : (matches[5] ? +matches[5] : undefined),
                protocol: matches[6] ?? 'tcp',
            }
            if (data.host_end && data.host_start && data.host_end < data.host_start) {
                throw new Error(`Invalid port expression: ${exp}`)
            }
            if (data.container_end && data.container_start && data.container_end < data.container_start) {
                throw new Error(`Invalid port expression: ${exp}`)
            }
            if (data.container_start && data.container_end && data.host_start && data.host_end) {
                for (let i = 0; i <= data.host_end - data.host_start; i++) {
                    ports[`${data.container_start + i}/${data.protocol}`] = [{ HostIp: data.ip, HostPort: (data.host_start + i) + '' }]
                }
            } else if (data.container_start && !data.container_end && data.host_start && data.host_end) {
                ports[`${data.container_start}/${data.protocol}`] = [{ HostIp: data.ip, HostPort: `${data.host_start}-${data.host_end}` }]
            } else if (data.container_start && !data.container_end && data.host_start && !data.host_end) {
                ports[`${data.container_start}/${data.protocol}`] = [{ HostIp: data.ip, HostPort: `${data.host_start}` }]
            } else if (data.container_start && !data.container_end && !data.host_start && !data.host_end) {
                ports[`${data.container_start}/${data.protocol}`] = [{ HostIp: data.ip, HostPort: '0' }]
            } else if (data.container_start && data.container_end && !data.host_start && !data.host_end) {
                for (let i = 0; i <= data.container_end - data.container_start; i++) {
                    ports[`${data.container_start + i}/${data.protocol}`] = [{ HostIp: data.ip, HostPort: '0' }]
                }
            } else {
                throw new Error(`Invalid port expression: ${exp}`)
            }
        } else {
            ports[exp.target + `/${exp.protocol ?? 'tcp'}`] = [{ HostIp: exp.host_ip ?? '0.0.0.0', HostPort: exp.published ? exp.published + '' : '0' }]
        }
    }
    return ports
}

export function parse_command(cmd: string | string[]): string[] {
    if (Array.isArray(cmd)) {
        return cmd
    }
    const result: string[] = []
    let current = ''
    let in_quotes = false
    let quote_char = ''
    let escape = false

    for (let i = 0; i < cmd.length; i++) {
        const char = cmd[i]

        if (escape) {
            current += char
            escape = false
        } else if (char === '\\') {
            escape = true
        } else if (in_quotes) {
            if (char === quote_char) {
                in_quotes = false
            } else {
                current += char
            }
        } else {
            if (char === '"' || char === '\'') {
                in_quotes = true
                quote_char = char
            } else if (char === ' ') {
                if (current) {
                    result.push(current)
                    current = ''
                }
            } else {
                current += char
            }
        }
    }

    if (current) {
        result.push(current)
    }

    return result
}

export function parse_expose(expose: (string | number)[]): Record<string, {}> {
    const exposed_ports: Record<string, {}> = {}
    expose.forEach(port => {
        if (typeof port === 'string') {
            const matches = port.match(/^(\d+)(?:-(\d+))?(?:\/(tcp|udp))?$/)
            if (matches) {
                const start = +matches[1]
                const end = +(matches[2] ?? matches[1])
                const protocol = matches[3] || 'tcp' // default protocol is tcp
                for (let p = start; p <= end; p++) {
                    exposed_ports[`${p}/${protocol}`] = {}
                }
            }
        } else {
            exposed_ports[`${port}/tcp`] = {}
        }
    })
    return exposed_ports
}

export const INTERPOLATION_REGEX = /\$([_a-zA-Z][_a-zA-Z0-9]*)|\$\{([_a-zA-Z][_a-zA-Z0-9]*)(?:(\?|:\?|-|:-|\+|:\+)([^{}]*))?}/

export function interpolate<T>(src: T): T {
    if (typeof src === 'string') {
        let result: string = src
        let match: RegExpExecArray | null
        while ((match = INTERPOLATION_REGEX.exec(result)) !== null) {
            const key = match[1] ?? match[2]
            const operator = match[3]
            const value = match[4]
            if (!operator) {
                if (process.env[key] == undefined) {
                    logger.warn(`Environment variable %s is not defined`, key)
                }
                result = result.replace(match[0], process.env[key] ?? '')
            } else {
                switch (operator) {
                    case '?':
                    case ':?':
                        if (!process.env[key] == undefined) {
                            throw new Error(`Environment variable ${key} is not defined`)
                        }
                        if (operator === ':?' && !process.env[key]) {
                            throw new Error(`Environment variable ${key} is empty`)
                        }
                        result = result.replace(match[0], process.env[key] || '')
                        break
                    case '-':
                        result = result.replace(match[0], process.env[key] ?? value ?? '')
                        break
                    case ':-':
                        result = result.replace(match[0], process.env[key] || value || '')
                        break
                    case '+':
                        result = result.replace(match[0], process.env[key] != undefined ? value : '')
                        break
                    case ':+':
                        result = result.replace(match[0], process.env[key] ? value : '')
                        break
                    default:
                        result = result.replace(match[0], '')
                        break
                }
            }
        }
        return result as any
    } else {
        return src
    }
}

export function traverse_interpolate<T>(data: T): T {
    if (typeof data === 'string') {
        return interpolate(data)
    } else if (data == undefined) {
        return data
    } else if (typeof data === 'object') {
        if (Array.isArray(data)) {
            return data.map(traverse_interpolate) as any
        } else {
            return Object.fromEntries(Object.entries(data as any).map(([k, v]) => [k, traverse_interpolate(v)])) as any
        }
    } else {
        return data
    }
}

export function volume_def_to_parameters(
    name: string,
    project_name: string,
    volume: DockerDef.DefinitionsVolume,
): {
    name: string,
    external: boolean,
    params: DockerApi.VolumeCreateParameters
} {
    volume = traverse_interpolate(volume)
    logger.debug('volume %O', volume)
    const params: DockerApi.VolumeCreateParameters = {
        Name: volume.name ?? `${project_name}_${name}`,
        Labels: {}
    }
    if (volume.driver) {
        params.Driver = volume.driver
    }
    if (volume.driver_opts) {
        params.DriverOpts = normalize_dict(volume.driver_opts)
    }
    if (volume.labels) {
        params.Labels = normalize_dict(volume.labels)
    }
    return { name, external: volume.external ?? false, params }
}

export function network_def_to_parameters(
    name: string,
    project_name: string,
    network: DockerDef.DefinitionsNetwork,
): {
    name: string,
    external: boolean,
    params: DockerApi.NetworkCreateParameters
} {
    network = traverse_interpolate(network)
    logger.debug('network %O', network)
    const params: DockerApi.NetworkCreateParameters = {
        Name: network.name ?? `${project_name}_${name}`,
        Labels: {},
    }
    if (network.driver) {
        params.Driver = network.driver
    }
    if (network.driver_opts) {
        params.Options = normalize_dict(network.driver_opts)
    }
    if (network.internal) {
        params.Internal = network.internal
    }
    if (network.attachable) {
        params.Attachable = network.attachable
    }
    if (network.enable_ipv6) {
        params.EnableIPv6 = network.enable_ipv6
    }
    if (network.labels) {
        params.Labels = normalize_dict(network.labels)
    }
    if (network.ipam) {
        params.IPAM = {}
        if (network.ipam.driver) {
            params.IPAM.Driver = network.ipam.driver
        }
        if (network.ipam.options) {
            params.IPAM.Options = normalize_dict(network.ipam.options)
        }
        if (network.ipam.config) {
            params.IPAM.Config = network.ipam.config.map(conf => {
                const ipam_config: DockerApi.NetworkCreateParametersIPAMConfig = {}
                if (conf.subnet) {
                    ipam_config.Subnet = conf.subnet
                }
                if (conf.gateway) {
                    ipam_config.Gateway = conf.gateway
                }
                if (conf.ip_range) {
                    ipam_config.IPRange = conf.ip_range
                }
                if (conf.aux_addresses) {
                    ipam_config.AuxiliaryAddresses = normalize_dict(conf.aux_addresses)
                }
                return ipam_config
            })
        }
    }
    return { name, external: network.external ?? false, params }
}

export function service_def_to_parameters(
    name: string,
    project_name: string,
    service: DockerDef.DefinitionsService,
    volumes: Record<string, DockerDef.DefinitionsVolume>,
    networks: Record<string, DockerDef.DefinitionsNetwork>,
): {
    name: string
    platform?: string
    replicas: number
    params: DockerApi.ContainerCreateParameters
    volumes: Record<string, DockerDef.DefinitionsVolume>,
    networks: Record<string, DockerDef.DefinitionsNetwork>,
} {
    service = traverse_interpolate(service)
    logger.debug('service %O', service)
    const params_hash = hash_object(service)
    const referenced_volumes: Record<string, DockerDef.DefinitionsVolume> = {}
    const referenced_networks: Record<string, DockerDef.DefinitionsNetwork> = {}
    const result: DockerApi.ContainerCreateParameters = { Image: service.image, Labels: {}, HostConfig: { Binds: [] } }
    if (service.develop) {
        // TODO: implement
        logger.warn('Not implemented: develop')
    }
    if (service.deploy) {
        if (Object.keys(service.deploy).some(k => k !== 'replicas')) {
            logger.warn('Not implemented: deploy, the only valid field is "replicas"')
        }
    }
    if (service.annotations) {
        result.HostConfig.Annotations = normalize_dict(service.annotations)
    }
    if (service.blkio_config) {
        if (service.blkio_config.weight) {
            result.HostConfig.BlkioWeight = +service.blkio_config.weight
        }
        if (service.blkio_config.weight_device) {
            result.HostConfig.BlkioWeightDevice = service.blkio_config.weight_device.map(dev => ({ Path: dev.path, Weight: +dev.weight }))
        }
        if (service.blkio_config.device_read_bps) {
            result.HostConfig.BlkioDeviceReadBps = service.blkio_config.device_read_bps.map(dev => ({ Path: dev.path, Rate: +dev.rate }))
        }
        if (service.blkio_config.device_read_iops) {
            result.HostConfig.BlkioDeviceReadIOps = service.blkio_config.device_read_iops.map(dev => ({ Path: dev.path, Rate: +dev.rate }))
        }
        if (service.blkio_config.device_write_bps) {
            result.HostConfig.BlkioDeviceWriteBps = service.blkio_config.device_write_bps.map(dev => ({ Path: dev.path, Rate: +dev.rate }))
        }
        if (service.blkio_config.device_write_iops) {
            result.HostConfig.BlkioDeviceWriteIOps = service.blkio_config.device_write_iops.map(dev => ({ Path: dev.path, Rate: +dev.rate }))
        }
    }
    if (service.cap_add) {
        result.HostConfig.CapAdd = service.cap_add
    }
    if (service.cap_drop) {
        result.HostConfig.CapDrop = service.cap_drop
    }
    if (service.cgroup) {
        result.HostConfig.Cgroup = service.cgroup
    }
    if (service.cgroup_parent) {
        result.HostConfig.CgroupParent = service.cgroup_parent
    }
    if (service.command != undefined) {
        result.Cmd = parse_command(service.command)
    }
    if (service.configs) {
        // TODO: implement
        logger.warn('Not implemented: configs')
    }
    if (service.cpu_count) {
        result.HostConfig.CpuCount = +service.cpu_count
    }
    if (service.cpu_percent) {
        result.HostConfig.CpuPercent = +service.cpu_percent
    }
    if (service.cpu_shares) {
        result.HostConfig.CpuShares = +service.cpu_shares
    }
    if (service.cpu_quota) {
        result.HostConfig.CpuQuota = +service.cpu_quota
    }
    if (service.cpu_period) {
        result.HostConfig.CpuPeriod = +service.cpu_period
    }
    if (service.cpu_rt_period) {
        result.HostConfig.CpuRealtimePeriod = parse_duration(service.cpu_rt_period)
    }
    if (service.cpu_rt_runtime) {
        result.HostConfig.CpuRealtimeRuntime = parse_duration(service.cpu_rt_runtime)
    }
    if (service.cpus) {
        result.HostConfig.NanoCpus = +service.cpus * 1000000000
    }
    if (service.cpuset) {
        result.HostConfig.CpusetCpus = service.cpuset
    }
    if (service.credential_spec) {
        // TODO: implement
        logger.warn('Not implemented: credential_spec')
    }
    if (service.depends_on) {
        // TODO: implement
        logger.warn('Not implemented: depends_on')
    }
    if (service.devices) {
        result.HostConfig.Devices = service.devices.map(dev => {
            if (typeof dev === 'string') {
                const fields = dev.split(':')
                return { PathOnHost: fields[0], PathInContainer: fields[1] || fields[0], CgroupPermissions: fields[2] || 'rwm' }
            } else {
                return { PathOnHost: dev.source, PathInContainer: dev.target || dev.source, CgroupPermissions: dev.permissions || 'rwm' }
            }
        })
    }
    if (service.device_cgroup_rules) {
        result.HostConfig.DeviceCgroupRules = service.device_cgroup_rules
    }
    if (service.dns) {
        if (typeof service.dns === 'string') {
            result.HostConfig.Dns = [service.dns]
        } else {
            result.HostConfig.Dns = service.dns
        }
    }
    if (service.dns_opt) {
        result.HostConfig.DnsOptions = service.dns_opt
    }
    if (service.dns_search) {
        if (typeof service.dns_search === 'string') {
            result.HostConfig.DnsSearch = [service.dns_search]
        } else {
            result.HostConfig.DnsSearch = service.dns_search
        }
    }
    if (service.domainname) {
        result.Domainname = service.domainname
    }
    if (service.entrypoint != undefined) {
        result.Entrypoint = parse_command(service.entrypoint)
    }
    if (service.env_file) {
        // TODO: implement
        logger.warn('Not implemented: env_file')
    }
    if (service.environment) {
        if (Array.isArray(service.environment)) {
            result.Env = service.environment
        } else {
            result.Env = Object.entries(service.environment).filter(([_, v]) => v).map(([k, v]) => `${k}=${v}`)
        }
    }
    if (service.expose) {
        result.ExposedPorts = parse_expose(service.expose)
    }
    if (service.extends) {
        // TODO: implement
        logger.warn('Not implemented: extends')
    }
    if (service.external_links) {
        // TODO: implement
        logger.warn('Not implemented: external_links')
    }
    if (service.extra_hosts) {
        if (Array.isArray(service.extra_hosts)) {
            result.HostConfig.ExtraHosts = service.extra_hosts
        } else {
            result.HostConfig.ExtraHosts = Object.entries(service.extra_hosts).map(([k, v]) => `${k}:${v}`)
        }
    }
    if (service.group_add) {
        result.HostConfig.GroupAdd = service.group_add.map(g => g + '')
    }
    if (service.healthcheck && !service.healthcheck.disable && service.healthcheck.test) {
        result.HealthCheck = {}
        if (Array.isArray(service.healthcheck.test)) {
            result.HealthCheck.Test = service.healthcheck.test
        } else {
            result.HealthCheck.Test = ['CMD-SHELL', ...parse_command(service.healthcheck.test)]
        }
        if (service.healthcheck.interval) {
            result.HealthCheck.Interval = parse_duration(service.healthcheck.interval) * 1000
            if (result.HealthCheck.Interval && result.HealthCheck.Interval < 1000000) {
                result.HealthCheck.Interval = 1000000
            }
        }
        if (service.healthcheck.timeout) {
            result.HealthCheck.Timeout = parse_duration(service.healthcheck.timeout) * 1000
            if (result.HealthCheck.Timeout && result.HealthCheck.Timeout < 1000000) {
                result.HealthCheck.Timeout = 1000000
            }
        }
        if (service.healthcheck.retries) {
            result.HealthCheck.Retries = +service.healthcheck.retries
        }
        if (service.healthcheck.start_period) {
            result.HealthCheck.StartPeriod = parse_duration(service.healthcheck.start_period) * 1000
            if (result.HealthCheck.StartPeriod && result.HealthCheck.StartPeriod < 1000000) {
                result.HealthCheck.StartPeriod = 1000000
            }
        }
        if (service.healthcheck.start_interval) {
            result.HealthCheck.StartInterval = parse_duration(service.healthcheck.start_interval) * 1000
            if (result.HealthCheck.StartInterval && result.HealthCheck.StartInterval < 1000000) {
                result.HealthCheck.StartInterval = 1000000
            }
        }
    }
    if (service.hostname) {
        result.Hostname = service.hostname
    }
    if (service.init) {
        result.HostConfig.Init = service.init
    }
    if (service.ipc) {
        // TODO: implement
        logger.warn('Not implemented: ipc')
    }
    if (service.isolation) {
        result.HostConfig.Isolation = service.isolation
    }
    if (service.labels) {
        result.Labels = normalize_dict(service.labels, true)
        result.Labels[LABEL.ConfigHash] = params_hash
    } else {
        result.Labels = { [LABEL.ConfigHash]: params_hash }
    }
    if (service.links) {
        // TODO: implement
        logger.warn('Not implemented: links')
    }
    if (service.logging) {
        // TODO: implement
        logger.warn('Not implemented: logging')
    }
    if (service.mac_address != undefined) {
        result.MacAddress = service.mac_address
    }
    if (service.mem_limit != undefined) {
        result.HostConfig.Memory = parse_bytes(service.mem_limit)
    }
    if (service.mem_reservation != undefined) {
        result.HostConfig.MemoryReservation = parse_bytes(service.mem_reservation)
    }
    if (service.mem_swappiness != undefined) {
        result.HostConfig.MemorySwappiness = service.mem_swappiness
    }
    if (service.memswap_limit != undefined) {
        result.HostConfig.MemorySwap = parse_bytes(service.memswap_limit)
    }
    if (service.network_mode != undefined) {
        result.HostConfig.NetworkMode = service.network_mode
    }
    result.NetworkingConfig = { EndpointsConfig: {} }
    if (service.networks) {
        if (Array.isArray(service.networks)) {
            for (const reference_name of service.networks) {
                if (!networks[reference_name]) {
                    throw new Error(`service ${name} refers to undefined network ${reference_name}: invalid project`)
                }
                referenced_networks[reference_name] = networks[reference_name]
                const network_name = networks[reference_name].name ?? `${project_name}_${reference_name}`
                result.NetworkingConfig.EndpointsConfig[network_name] = {}
            }
        } else {
            for (const [reference_name, config] of Object.entries(service.networks)) {
                if (!networks[reference_name]) {
                    throw new Error(`service ${name} refers to undefined network ${reference_name}: invalid project`)
                }
                referenced_networks[reference_name] = networks[reference_name]
                const network_name = networks[reference_name].name ?? `${project_name}_${reference_name}`
                result.NetworkingConfig.EndpointsConfig[network_name] = {}
                if (config?.aliases) {
                    result.NetworkingConfig.EndpointsConfig[network_name].Aliases = config.aliases
                }
                if (config?.mac_address) {
                    result.NetworkingConfig.EndpointsConfig[network_name].MacAddress = config.mac_address
                }
                if (config?.priority != undefined) {
                    // TODO: implement
                    logger.warn('Not implemented: networks.priority')
                }
                if (config?.ipv4_address || config?.ipv6_address || config?.link_local_ips) {
                    result.NetworkingConfig.EndpointsConfig[network_name].IPAMConfig = {}
                    if (config?.ipv4_address) {
                        result.NetworkingConfig.EndpointsConfig[network_name].IPAMConfig.IPv4Address = config.ipv4_address
                    }
                    if (config?.ipv6_address) {
                        result.NetworkingConfig.EndpointsConfig[network_name].IPAMConfig.IPv6Address = config.ipv6_address
                    }
                    if (config?.link_local_ips) {
                        result.NetworkingConfig.EndpointsConfig[network_name].IPAMConfig.LinkLocalIPs = config.link_local_ips
                    }
                }
                if (config?.driver_opts) {
                    result.NetworkingConfig.EndpointsConfig[network_name].DriverOpts = normalize_dict(config.driver_opts)
                }
            }
        }
    }
    if (!Object.keys(result.NetworkingConfig.EndpointsConfig).length) {
        referenced_networks['default'] = {}
        result.NetworkingConfig.EndpointsConfig[`${project_name}_default`] = {}
    }
    if (service.oom_kill_disable != undefined) {
        result.HostConfig.OomKillDisable = service.oom_kill_disable
    }
    if (service.oom_score_adj != undefined) {
        result.HostConfig.OomScoreAdj = service.oom_score_adj
    }
    if (service.pid) {
        result.HostConfig.PidMode = service.pid
    }
    if (service.pids_limit != undefined) {
        result.HostConfig.PidsLimit = service.pids_limit
    }
    if (service.ports) {
        result.HostConfig.PortBindings = parse_ports(service.ports)
    }
    if (service.post_start) {
        // TODO: implement
        logger.warn('Not implemented: post_start')
    }
    if (service.pre_stop) {
        // TODO: implement
        logger.warn('Not implemented: pre_stop')
    }
    if (service.privileged != undefined) {
        result.HostConfig.Privileged = service.privileged
    }
    if (service.profiles) {
        // TODO: implement
        logger.warn('Not implemented: profiles')
    }
    if (service.read_only != undefined) {
        result.HostConfig.ReadonlyRootfs = true
    }
    if (service.restart) {
        if (service.restart.startsWith('on-failure')) {
            result.HostConfig.RestartPolicy = { Name: 'on-failure', MaximumRetryCount: +service.restart.slice(11) || 0 }
        } else {
            result.HostConfig.RestartPolicy = { Name: service.restart as any }
        }
    }
    if (service.runtime) {
        result.HostConfig.Runtime = service.runtime
    }
    if (service.scale) {
        // TODO: implement
        logger.warn('Not implemented: scale')
    }
    if (service.secrets) {
        // TODO: implement
        logger.warn('Not implemented: secrets')
    }
    if (service.security_opt) {
        result.HostConfig.SecurityOpt = service.security_opt
    }
    if (service.shm_size) {
        result.HostConfig.ShmSize = parse_bytes(service.shm_size)
    }
    if (service.sysctls) {
        if (Array.isArray(service.sysctls)) {
            result.HostConfig.Sysctls = Object.fromEntries(service.sysctls.map(exp => {
                const first_equal_sign = exp.indexOf('=')
                if (first_equal_sign === -1) {
                    return [exp, '']
                } else {
                    return [exp.slice(0, first_equal_sign), exp.slice(first_equal_sign + 1)]
                }
            }))
        } else {
            result.HostConfig.Sysctls = Object.fromEntries(Object.entries(service.sysctls).map(([k, v]) => [k, v + '']))
        }
    }
    if (service.stdin_open) {
        result.OpenStdin = service.stdin_open
    }
    if (service.stop_grace_period) {
        result.StopTimeout = Math.floor(parse_duration(service.stop_grace_period) / 1000000)
    }
    if (service.stop_signal) {
        result.StopSignal = service.stop_signal
    }
    if (service.storage_opt) {
        result.HostConfig.StorageOpt = Object.fromEntries(Object.entries(service.storage_opt).map(([k, v]) => [k, v + '']))
    }
    if (service.tmpfs) {
        const tmpfs = typeof service.tmpfs === 'string' ? [service.tmpfs] : service.tmpfs
        result.HostConfig.Tmpfs = Object.fromEntries(tmpfs.map(exp => exp.split(':').slice(0, 2)))
    }
    if (service.tty != undefined) {
        result.Tty = service.tty
    }
    if (service.ulimits) {
        result.HostConfig.Ulimits = Object.entries(service.ulimits).map(([name, value]) => {
            if (typeof value === 'number') {
                return { Name: name, Soft: value, Hard: value }
            } else if (typeof value === 'string') {
                return { Name: name, Soft: +value, Hard: +value }
            } else {
                return { Name: name, Soft: +value.soft, Hard: +value.hard }
            }
        })
    }
    if (service.user) {
        result.User = service.user
    }
    if (service.userns_mode) {
        result.HostConfig.UsernsMode = service.userns_mode
    }
    if (service.uts) {
        result.HostConfig.UTSMode = service.uts
    }
    if (service.volumes) {
        result.HostConfig.Binds = []
        result.HostConfig.Mounts = []
        for (const item of service.volumes) {
            if (typeof item === 'string') {
                if (item.startsWith('/')) {
                    result.HostConfig.Binds.push(item)
                } else {
                    const [src, dest, access] = item.split(':')
                    if (!volumes[src]) {
                        throw new Error(`service ${name} refers to undefined volume ${src}: invalid project`)
                    }
                    referenced_volumes[src] = volumes[src]
                    result.HostConfig.Mounts.push({
                        Type: 'volume',
                        Source: volumes[src].name ?? `${project_name}_${src}`,
                        Target: dest,
                        ReadOnly: access === 'ro'
                    })
                }
            } else {
                const mount: typeof result.HostConfig.Mounts[0] = { Type: item.type }
                if (item.type === 'volume') {
                    if (!item.source) {
                        throw new Error(`service ${name} volume with no source specified: invalid project`)
                    }
                    if (!volumes[item.source]) {
                        throw new Error(`service ${name} refers to undefined volume ${item.source}: invalid project`)
                    }
                    referenced_volumes[item.source] = volumes[item.source]
                    mount.Source = volumes[item.source].name ?? `${project_name}_${item.source}`
                } else if (item.source) {
                    mount.Source = item.source
                }
                if (item.target) {
                    mount.Target = item.target
                }
                if (item.read_only) {
                    mount.ReadOnly = item.read_only
                }
                if (item.consistency) {
                    mount.Consistency = item.consistency
                }
                if (item.bind) {
                    mount.BindOptions = {}
                    if (item.bind.propagation) {
                        mount.BindOptions.Propagation = item.bind.propagation
                    }
                    if (item.bind.create_host_path) {
                        mount.BindOptions.CreateMountpoint = item.bind.create_host_path
                    }
                }
                if (item.volume) {
                    mount.VolumeOptions = {}
                    if (item.volume.nocopy) {
                        mount.VolumeOptions.NoCopy = item.volume.nocopy
                    }
                }
                if (item.tmpfs) {
                    mount.TmpfsOptions = {}
                    if (item.tmpfs.size) {
                        mount.TmpfsOptions.SizeBytes = parse_bytes(item.tmpfs.size)
                    }
                    if (item.tmpfs.mode) {
                        mount.TmpfsOptions.Mode = item.tmpfs.mode
                    }
                }
                result.HostConfig.Mounts.push(mount)
            }
        }
    }
    if (service.volumes_from) {
        result.HostConfig.VolumesFrom = service.volumes_from
    }
    if (service.working_dir) {
        result.WorkingDir = service.working_dir
    }
    return {
        name: name,
        platform: service.platform,
        replicas: service.deploy?.replicas ? +service.deploy.replicas : 1,
        params: result,
        volumes: referenced_volumes,
        networks: referenced_networks
    }
}
