export namespace DockerDef {

    export interface DefinitionStat {
        name: string
        valid: boolean
        reason?: string[]
        def: UnifiedDefinitions
        content: string
        filename: string
        mtimeMs: number
        size: number
    }

    export type ListOfStrings = string[]
    export type StringOrList = string | ListOfStrings
    export type ListOrDict = string[] | { [k: string]: string | number | boolean | null }
    export type Command = null | string | string[]
    export type EnvFile = string | (string | { path: string, format?: string, required?: boolean | string })[]
    export type ExtraHosts = {} | string[]

    export type ServiceConfigOrSecret = (string | {
        source?: string
        target?: string
        uid?: string
        gid?: string
        mode?: number | string
    })[]

    export type DefinitionsGenericResources = ({
        discrete_resource_spec?: {
            kind?: string
            value?: number | string
        }
    })[]

    export interface Ulimits {
        [k: string]: number | string | { hard: number | string, soft: number | string }
    }

    export interface BlkioLimit {
        path: string
        rate: number | string
    }

    export interface BlkioWeight {
        path: string
        weight: number | string
    }

    export interface DefinitionsHealthcheck {
        disable?: boolean | string
        interval?: string
        retries?: number | string
        test?: string | string[]
        timeout?: string
        start_period?: string
        start_interval?: string
    }

    export interface DefinitionsServiceHook {
        command?: Command
        user?: string
        privileged?: boolean | string
        working_dir?: string
        environment?: ListOrDict
    }

    export type DefinitionsDevices = {
        capabilities: ListOfStrings
        count?: string | number
        device_ids?: ListOfStrings
        driver?: string
        options?: ListOrDict
    }[]

    export interface DefinitionsDevelopment {
        watch?: {
            ignore?: string[]
            path: string
            action: 'rebuild' | 'sync' | 'sync+restart'
            target?: string
        }[]
    }

    export interface DefinitionsDeployment {
        mode?: string
        endpoint_mode?: string
        /**
         * @type integer
         * @minimum 1
         */
        replicas?: number
        labels?: ListOrDict
        rollback_config?: {
            parallelism?: number | string
            delay?: string
            failure_action?: string
            monitor?: string
            max_failure_ratio?: number | string
            order?: 'start-first' | 'stop-first'
        }
        update_config?: {
            parallelism?: number | string
            delay?: string
            failure_action?: string
            monitor?: string
            max_failure_ratio?: number | string
            order?: 'start-first' | 'stop-first'
        }
        resources?: {
            limits?: {
                cpus?: number | string
                memory?: string
                pids?: number | string
            }
            reservations?: {
                cpus?: number | string
                memory?: string
                generic_resources?: DefinitionsGenericResources
                devices?: DefinitionsDevices
            }
        }
        restart_policy?: {
            condition?: string
            delay?: string
            max_attempts?: number | string
            window?: string
        }
        placement?: {
            constraints?: string[]
            preferences?: { spread?: string }[]
            max_replicas_per_node?: number | string
        }
    }

    export type DefinitionsNetwork = {
        name?: string
        driver?: string
        driver_opts?: { [k: string]: string | number }
        ipam?: {
            driver?: string
            config?: {
                subnet?: string
                ip_range?: string
                gateway?: string
                aux_addresses?: { [k: string]: string }
            }[]
            options?: { [k: string]: string }
        }
        internal?: boolean
        enable_ipv6?: boolean
        attachable?: boolean
        external?: boolean
        labels?: ListOrDict
    }

    export interface DefinitionsVolume {
        name?: string
        driver?: string
        driver_opts?: { [k: string]: string | number }
        external?: boolean
        labels?: ListOrDict
    }

    export interface DefinitionsService {
        develop?: DefinitionsDevelopment
        deploy?: DefinitionsDeployment
        annotations?: ListOrDict
        build?: string | {
            context?: string
            dockerfile?: string
            dockerfile_inline?: string
            entitlements?: string[]
            args?: ListOrDict
            ssh?: ListOrDict
            labels?: ListOrDict
            cache_from?: string[]
            cache_to?: string[]
            no_cache?: boolean | string
            additional_contexts?: ListOrDict
            network?: string
            pull?: boolean | string
            target?: string
            shm_size?: number | string
            extra_hosts?: ExtraHosts
            isolation?: string
            privileged?: boolean | string
            secrets?: ServiceConfigOrSecret
            tags?: string[]
            ulimits?: Ulimits
            platforms?: string[]
        }
        blkio_config?: {
            device_read_bps?: BlkioLimit[]
            device_read_iops?: BlkioLimit[]
            device_write_bps?: BlkioLimit[]
            device_write_iops?: BlkioLimit[]
            weight?: number | string
            weight_device?: BlkioWeight[]
        }
        cap_add?: string[]
        cap_drop?: string[]
        cgroup?: 'host' | 'private'
        cgroup_parent?: string
        command?: Command
        configs?: ServiceConfigOrSecret
        /**
         * @pattern ^[0-9]+(\.[0-9]+)?$
         */
        cpu_count?: string | number
        /**
         * @pattern ^[0-9]+(\.[0-9]+)?$
         */
        cpu_percent?: string | number
        /**
         * @pattern ^[0-9]+(\.[0-9]+)?$
         */
        cpu_shares?: number | string
        /**
         * @pattern ^[0-9]+(\.[0-9]+)?$
         */
        cpu_quota?: number | string
        /**
         * @pattern ^[0-9]+(\.[0-9]+)?$
         */
        cpu_period?: number | string
        /**
         * @pattern ^(\d+(us|ms|s|m|h))+$
         */
        cpu_rt_period?: number | string
        /**
         * @pattern ^(\d+(us|ms|s|m|h))+$
         */
        cpu_rt_runtime?: number | string
        /**
         * @pattern ^[0-9]+(\.[0-9]+)?$
         */
        cpus?: number | string
        cpuset?: string
        credential_spec?: {
            config?: string
            file?: string
            registry?: string
        }
        depends_on?: ListOfStrings | {
            [k: string]: {
                restart?: boolean | string
                required?: boolean
                condition:
                    | 'service_started'
                    | 'service_healthy'
                    | 'service_completed_successfully'
            }
        }
        devices?: (string | {
            source: string
            target?: string
            permissions?: string
        })[]
        device_cgroup_rules?: ListOfStrings
        dns?: StringOrList
        dns_opt?: string[]
        dns_search?: StringOrList
        domainname?: string
        entrypoint?: Command
        env_file?: EnvFile
        environment?: ListOrDict
        expose?: (string | number)[]
        extends?: string | {
            service: string
            file?: string
        }
        external_links?: string[]
        extra_hosts?: ExtraHosts
        group_add?: (string | number)[]
        healthcheck?: DefinitionsHealthcheck
        hostname?: string
        image: string
        init?: boolean
        ipc?: string
        isolation?: 'default' | 'process' | 'hyperv'
        labels?: ListOrDict
        links?: string[]
        logging?: {
            driver?: string
            options?: { [k: string]: string | number | null }
        }
        mac_address?: string
        mem_limit?: number | string
        mem_reservation?: string | number
        /**
         *  @minimum 0
         *  @maximum 100
         */
        mem_swappiness?: number
        memswap_limit?: number | string
        network_mode?: string
        networks?: ListOfStrings | {
            [k: string]: {
                aliases?: ListOfStrings
                ipv4_address?: string
                ipv6_address?: string
                link_local_ips?: ListOfStrings
                mac_address?: string
                driver_opts?: { [k: string]: string | number }
                priority?: number
            } | null
        }
        oom_kill_disable?: boolean
        /**
         * @type integer
         * @minimum -1000
         * @maximum 1000
         */
        oom_score_adj?: number
        pid?: string
        pids_limit?: number
        platform?: string
        ports?: (number | string | {
            name?: string
            mode?: string
            host_ip?: string
            target?: number | string
            published?: string | number
            protocol?: string
            app_protocol?: string
        })[]
        post_start?: DefinitionsServiceHook[]
        pre_stop?: DefinitionsServiceHook[]
        privileged?: boolean
        profiles?: ListOfStrings
        pull_policy?: 'always' | 'never' | 'if_not_present' | 'build' | 'missing'
        read_only?: boolean
        restart?: string
        runtime?: string
        scale?: number | string
        security_opt?: string[]
        shm_size?: number | string
        secrets?: ServiceConfigOrSecret
        sysctls?: ListOrDict
        stdin_open?: boolean
        stop_grace_period?: string
        stop_signal?: string
        storage_opt?: {
            [k: string]: unknown
        }
        tmpfs?: StringOrList
        tty?: boolean
        ulimits?: Ulimits
        user?: string
        uts?: string
        userns_mode?: string
        volumes?: (string | {
            type: 'bind' | 'volume' | 'tmpfs' | 'npipe' | 'cluster'
            source?: string
            target?: string
            read_only?: boolean
            consistency?: 'default' | 'consistent' | 'cached' | 'delegated'
            bind?: {
                propagation?: 'private' | 'rprivate' | 'shared' | 'rshared' | 'slave' | 'rslave'
                create_host_path?: boolean
                selinux?: 'z' | 'Z'
            }
            volume?: {
                nocopy?: boolean
            }
            tmpfs?: {
                size?: number | string
                /**
                 * @type integer
                 */
                mode?: number
            }
        })[]
        volumes_from?: string[]
        working_dir?: string
    }

    export interface DefinitionsSecret {
        name?: string
        environment?: string
        file?: string
        labels?: ListOrDict
        driver?: string
        driver_opts?: { [k: string]: string | number }
        template_driver?: string
    }

    export interface DefinitionsConfig {
        name?: string
        content?: string
        environment?: string
        file?: string
        labels?: ListOrDict
        template_driver?: string
    }

    export interface UnifiedDefinitions {
        services: { [key: string]: DefinitionsService }
        networks?: { [key: string]: DefinitionsNetwork }
        volumes?: { [key: string]: DefinitionsVolume }
        secrets?: { [key: string]: DefinitionsSecret }
        configs?: { [key: string]: DefinitionsConfig }
    }
}
