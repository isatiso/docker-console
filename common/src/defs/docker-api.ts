export namespace DockerApi {

    export interface ContainerFilter {
        ancestor?: string[]
        before?: string[]
        expose?: string[]
        exited?: number[]
        health?: ('starting' | 'healthy' | 'unhealthy' | 'none')[]
        id?: string[]
        isolation?: ('default' | 'process' | 'hyperv')[]
        'is-task'?: boolean[]
        label?: string[]
        name?: string[]
        network?: string[]
        publish?: string[]
        since?: string[]
        status?: ('created' | 'restarting' | 'running' | 'removing' | 'paused' | 'exited' | 'dead')[]
        volume?: string[]
    }

    export interface ContainerOverview {
        Id: string
        Names: string[]
        Image: string
        ImageID: string
        Command: string
        Created: number
        Ports: {
            IP: string
            PrivatePort: number
            PublicPort: number
            Type: 'tcp' | 'udp' | 'sctp'
        }[]
        SizeRw: number
        SizeRootFs: number
        Labels: { [key: string]: string }
        State: string
        Status: string
        HostConfig: {
            NetworkMode: string
        }
        NetworkSettings: {
            Networks: {
                [key: string]: {
                    IPAMConfig?: {
                        IPv4Address?: string
                        IPv6Address?: string
                        LinkLocalIPs?: string[]
                    }
                    Links?: string[]
                    Aliases?: string[]
                    NetworkID: string
                    EndpointID: string
                    Gateway: string
                    IPAddress: string
                    IPPrefixLen: number
                    IPv6Gateway: string
                    GlobalIPv6Address: string
                    GlobalIPv6PrefixLen: number
                    MacAddress: string
                    DriverOpts?: { [key: string]: string }
                }
            }
        }
        Mounts: {
            Type: 'bind' | 'volume' | 'tmpfs' | 'npipe'
            Name: string
            Source: string
            Destination: string
            Driver: string
            Mode: string
            RW: boolean
            Propagation: string
        }[]
    }

    export interface ContainerDetail {
        Id: string
        Created: string
        Path: string
        Args: string[]
        State?: {
            Status: 'created' | 'running' | 'paused' | 'restarting' | 'removing' | 'exited' | 'dead'
            Running: boolean
            Paused: boolean
            Restarting: boolean
            OOMKilled: boolean
            Dead: boolean
            Pid: number
            ExitCode: number
            Error: string
            StartedAt: string
            FinishedAt: string
            Health?: {
                Status: 'none' | 'starting' | 'healthy' | 'unhealthy'
                FailingStreak: number
                Log?: {
                    Start: string
                    End: string
                    ExitCode: number
                    Output: string
                }[]
            }
        }
        Image: string
        ResolvConfPath: string
        HostnamePath: string
        HostsPath: string
        LogPath: string
        Name: string
        RestartCount: number
        Driver: string
        Platform: string
        MountLabel: string
        ProcessLabel: string
        AppArmorProfile: string
        ExecIDs?: string[]
        HostConfig: {
            CpuShares: number
            Memory: number
            CgroupParent: string
            BlkioWeight: number
            BlkioWeightDevice: { Path: string, Weight: number }[]
            BlkioDeviceReadBps: { Path: string, Rate: number }[]
            BlkioDeviceWriteBps: { Path: string, Rate: number }[]
            BlkioDeviceReadIOps: { Path: string, Rate: number }[]
            BlkioDeviceWriteIOps: { Path: string, Rate: number }[]
            CpuPeriod: number
            CpuQuota: number
            CpuRealtimePeriod: number
            CpuRealtimeRuntime: number
            CpusetCpus: string
            CpusetMems: string
            Devices: { PathOnHost: string, PathInContainer: string, CgroupPermissions: string }[]
            DeviceCgroupRules: string[]
            DeviceRequests: {
                Driver: string
                Count: number
                DeviceIDs: string[]
                Capabilities: string[]
                Options: { [key: string]: string }
            }[]
            KernelMemory: number
            MemoryReservation: number
            MemorySwap: number
            MemorySwappiness: number
            NanoCpus: number
            OomKillDisable: boolean
            Init?: boolean
            PidsLimit?: number
            Ulimits: { Name: string, Soft: number, Hard: number }[]
            CpuCount: number
            CpuPercent: number
            IOMaximumIOps: number
            IOMaximumBandwidth: number
            Binds: string[]
            ContainerIDFile: string
            LogConfig: {
                Type: 'json-file' | 'syslog' | 'journald' | 'gelf' | 'fluentd' | 'awslogs' | 'splunk' | 'etwlogs' | 'none'
                Config: { [key: string]: string }
            }
            NetworkMode: string
            PortBindings: { [key: string]: { HostIp: string, HostPort: string }[] }
            RestartPolicy: { Name: '' | 'no' | 'always' | 'unless-stopped' } | { Name: 'on-failure', MaximumRetryCount: number }
            AutoRemove: boolean
            VolumeDriver: string
            VolumesFrom: string[]
            Mounts: {
                Target: string
                Source: string
                Type: 'bind' | 'volume' | 'tmpfs' | 'npipe' | 'cluster'
                ReadOnly: boolean
                Consistency: 'default' | 'consistent' | 'cached' | 'delegated'
                BindOptions: {
                    Propagation: 'private' | 'rprivate' | 'shared' | 'rshared' | 'slave' | 'rslave'
                    NonRecursive: boolean
                    CreateMountpoint: boolean
                }
                VolumeOptions: {
                    NoCopy: boolean
                    Labels: { [key: string]: string }
                    DriverConfig: { Name: string, Options: { [key: string]: string } }
                }
                TmpfsOptions: {
                    SizeBytes: number
                    Mode: number
                }
                Name: string
                Destination: string
                Driver: string
                Mode: string
                RW: boolean
                Propagation: string
            }[]
            ConsoleSize: number[]
            Annotations: { [key: string]: string }
            CapAdd: string[]
            CapDrop: string[]
            CgroupnsMode: 'host' | 'private'
            Dns: string[]
            DnsOptions: string[]
            DnsSearch: string[]
            ExtraHosts: string[]
            GroupAdd: string[]
            IpcMode: 'none' | 'private' | 'shareable' | `container:${string}` | 'host'
            Cgroup: string
            Links: string[]
            OomScoreAdj: number
            PidMode: string
            Privileged: boolean
            PublishAllPorts: boolean
            ReadonlyRootfs: boolean
            SecurityOpt: string[]
            StorageOpt: { [key: string]: string }
            Tmpfs: { [key: string]: string }
            UTSMode: string
            UsernsMode: string
            ShmSize: number
            Sysctls: { [key: string]: string }
            Runtime: string
            Isolation: 'default' | 'process' | 'hyperv'
            MaskedPaths: string[]
            ReadonlyPaths: string[]
        }
        GraphDriver: {
            Name: string
            Data: { [key: string]: string }
        }
        SizeRw: number
        SizeRootFs: number
        Mounts: {
            Type: 'bind' | 'volume' | 'tmpfs' | 'npipe' | 'cluster'
            Name: string
            Source: string
            Destination: string
            Driver: string
            Mode: string
            RW: boolean
            Propagation: string
        }[]
        Config: {
            Hostname: string
            Domainname: string
            User: string
            AttachStdin: boolean
            AttachStdout: boolean
            AttachStderr: boolean
            ExposedPorts: { [key: string]: {} }
            Tty: boolean
            OpenStdin: boolean
            StdinOnce: boolean
            Env: string[]
            Cmd: string[]
            HealthCheck: {
                Test: string[]
                Interval: number
                Timeout: number
                Retries: number
                StartPeriod: number
            }
            ArgsEscaped?: boolean
            Image: string
            Volumes: { [key: string]: {} }
            WorkingDir: string
            Entrypoint: string[]
            NetworkDisabled?: boolean
            MacAddress?: string
            OnBuild?: string[]
            Labels: { [key: string]: string }
            StopSignal?: string
            StopTimeout?: number
            Shell?: string[]
        }
        NetworkSettings: {
            Bridge: string
            SandboxID: string
            HairpinMode: boolean
            LinkLocalIPv6Address: string
            LinkLocalIPv6PrefixLen: number
            Ports: { [key: string]: { HostIp: string, HostPort: string }[] }
            SandboxKey: string
            SecondaryIPAddresses?: { Addr: string, PrefixLen: number }[]
            SecondaryIPv6Addresses?: { Addr: string, PrefixLen: number }[]
            EndpointID: string
            Gateway: string
            GlobalIPv6Address: string
            GlobalIPv6PrefixLen: number
            IPAddress: string
            IPPrefixLen: number
            IPv6Gateway: string
            MacAddress: string
            Networks: {
                [key: string]: {
                    IPAMConfig?: {
                        IPv4Address: string
                        IPv6Address: string
                        LinkLocalIPs: string[]
                    }
                    Links: string[]
                    Aliases: string[]
                    NetworkID: string
                    EndpointID: string
                    Gateway: string
                    IPAddress: string
                    IPPrefixLen: number
                    IPv6Gateway: string
                    GlobalIPv6Address: string
                    GlobalIPv6PrefixLen: number
                    MacAddress: string
                    DriverOpts?: { [key: string]: string }
                }
            }
        }
    }

    export interface ContainerCreateParameters {
        Hostname?: string
        Domainname?: string
        User?: string
        AttachStdin?: boolean
        AttachStdout?: boolean
        AttachStderr?: boolean
        ExposedPorts?: { [key: string]: {} }
        Tty?: boolean
        OpenStdin?: boolean
        StdinOnce?: boolean
        Env?: string[]
        Cmd?: string[]
        HealthCheck?: {
            Test?: string[]
            Interval?: number
            Timeout?: number
            Retries?: number
            StartPeriod?: number
            StartInterval?: number
        }
        ArgsEscaped?: boolean
        Image: string
        Volumes?: { [key: string]: {} }
        WorkingDir?: string
        Entrypoint?: string[]
        NetworkDisabled?: boolean
        MacAddress?: string
        OnBuild?: string[]
        Labels: { [key: string]: string }
        StopSignal?: string
        StopTimeout?: number
        Shell?: string[]
        HostConfig: {
            CpuShares?: number
            Memory?: number
            CgroupParent?: string
            BlkioWeight?: number
            BlkioWeightDevice?: { Path: string, Weight: number }[]
            BlkioDeviceReadBps?: { Path: string, Rate: number }[]
            BlkioDeviceWriteBps?: { Path: string, Rate: number }[]
            BlkioDeviceReadIOps?: { Path: string, Rate: number }[]
            BlkioDeviceWriteIOps?: { Path: string, Rate: number }[]
            CpuPeriod?: number
            CpuQuota?: number
            CpuRealtimePeriod?: number
            CpuRealtimeRuntime?: number
            CpusetCpus?: string
            CpusetMems?: string
            Devices?: { PathOnHost: string, PathInContainer: string, CgroupPermissions: string }[]
            DeviceCgroupRules?: string[]
            DeviceRequests?: {
                Driver: string
                Count: number
                DeviceIDs: string[]
                Capabilities: string[]
                Options: { [key: string]: string }
            }[]
            KernelMemoryTCP?: number
            MemoryReservation?: number
            MemorySwap?: number
            MemorySwappiness?: number
            NanoCpus?: number
            OomKillDisable?: boolean
            Init?: boolean
            PidsLimit?: number
            Ulimits?: { Name: string, Soft: number, Hard: number }[]
            CpuCount?: number
            CpuPercent?: number
            IOMaximumIOps?: number
            IOMaximumBandwidth?: number
            Binds: string[]
            ContainerIDFile?: string
            LogConfig?: {
                Type: 'json-file' | 'syslog' | 'journald' | 'gelf' | 'fluentd' | 'awslogs' | 'splunk' | 'etwlogs' | 'none'
                Config: { [key: string]: string }
            }
            NetworkMode?: string
            PortBindings?: { [key: string]: { HostIp: string, HostPort: string }[] }
            RestartPolicy?: { Name: '' | 'no' | 'always' | 'unless-stopped' } | { Name: 'on-failure', MaximumRetryCount: number }
            AutoRemove?: boolean
            VolumeDriver?: string
            VolumesFrom?: string[]
            Mounts?: {
                Type: 'bind' | 'volume' | 'tmpfs' | 'npipe' | 'cluster'
                Target?: string
                Source?: string
                ReadOnly?: boolean
                Consistency?: 'default' | 'consistent' | 'cached' | 'delegated'
                BindOptions?: {
                    Propagation?: 'private' | 'rprivate' | 'shared' | 'rshared' | 'slave' | 'rslave'
                    NonRecursive?: boolean
                    CreateMountpoint?: boolean
                }
                VolumeOptions?: {
                    NoCopy?: boolean
                    Labels?: { [key: string]: string }
                    DriverConfig?: { Name: string, Options: { [key: string]: string } }
                }
                TmpfsOptions?: {
                    SizeBytes?: number
                    Mode?: number
                }
            }[]
            ConsoleSize?: number[]
            Annotations?: { [key: string]: string }
            CapAdd?: string[]
            CapDrop?: string[]
            CgroupnsMode?: 'host' | 'private'
            Dns?: string[]
            DnsOptions?: string[]
            DnsSearch?: string[]
            ExtraHosts?: string[]
            GroupAdd?: string[]
            IpcMode?: 'none' | 'private' | 'shareable' | `container:${string}` | 'host'
            Cgroup?: string
            Links?: string[]
            OomScoreAdj?: number
            PidMode?: string
            Privileged?: boolean
            PublishAllPorts?: boolean
            ReadonlyRootfs?: boolean
            SecurityOpt?: string[]
            StorageOpt?: { [key: string]: string }
            Tmpfs?: { [key: string]: string }
            UTSMode?: string
            UsernsMode?: string
            ShmSize?: number
            Sysctls?: { [key: string]: string }
            Runtime?: string
            Isolation?: 'default' | 'process' | 'hyperv'
            MaskedPaths?: string[]
            ReadonlyPaths?: string[]
        }
        NetworkingConfig?: {
            EndpointsConfig: { [key: string]: NetworkEndpointConfig }
        }
    }

    export interface ImageFilter {
        before?: string[]
        dangling?: ('true' | 'false')[]
        label?: string[]
        reference?: string[]
        since?: string[]
    }

    export interface ImageOverview {
        Id: string
        ParentId: string
        RepoTags: string[]
        RepoDigests: string[]
        Created: number
        Size: number
        SharedSize: number
        VirtualSize: number
        Labels: { [key: string]: string }
        Containers: number
    }

    export interface ImageDetail {
        Id: string
        RepoTags: string[]
        RepoDigests: string[]
        Parent: string
        Comment: string
        Created: string
        Container: string
        ContainerConfig: {
            Hostname: string
            Domainname: string
            User: string
            AttachStdin: boolean
            AttachStdout: boolean
            AttachStderr: boolean
            ExposedPorts?: { [key: string]: {} }
            Tty: boolean
            OpenStdin: boolean
            StdinOnce: boolean
            Env: string[]
            Cmd: string[]
            HealthCheck: {
                Test: string[]
                Interval: number
                Timeout: number
                Retries: number
                StartPeriod: number
            }
            ArgsEscaped?: boolean
            Image: string
            Volumes: { [key: string]: {} }
            WorkingDir: string
            Entrypoint: string[]
            NetworkDisabled?: boolean
            MacAddress?: string
            OnBuild?: string[]
            Labels: { [key: string]: string }
            StopSignal?: string
            StopTimeout?: number
            Shell?: string[]
        }
        DeviceVersion: string
        Author: string
        Config: {
            Hostname: string
            Domainname: string
            User: string
            AttachStdin: boolean
            AttachStdout: boolean
            AttachStderr: boolean
            ExposedPorts?: { [key: string]: {} }
            Tty: boolean
            OpenStdin: boolean
            StdinOnce: boolean
            Env: string[]
            Cmd: string[]
            HealthCheck: {
                Test: string[]
                Interval: number
                Timeout: number
                Retries: number
                StartPeriod: number
            }
            ArgsEscaped?: boolean
            Image: string
            Volumes: { [key: string]: {} }
            WorkingDir: string
            Entrypoint: string[]
            NetworkDisabled?: boolean
            MacAddress?: string
            OnBuild?: string[]
            Labels: { [key: string]: string }
            StopSignal?: string
            StopTimeout?: number
            Shell?: string[]
        }
        Architecture: string
        Variant?: string
        Os: string
        OsVersion?: string
        Size: number
        VirtualSize: number
        GraphDriver: {
            Name: string
            Data: { [key: string]: string }
        }
        RootFS: {
            Type: string
            Layers: string[]
        }
        Metadata: {
            LastTagTime?: string
        }
    }

    export interface ContainerFileStat {
        name: string
        type: 'dir' | 'file' // extend this field by mode
        size: number
        mode: number
        mtime: string
        linkTarget: string
    }

    export interface ExecCreateParameters {
        AttachStdin?: boolean
        AttachStdout?: boolean
        AttachStderr?: boolean
        ConsoleSize?: number[]
        DetachKeys?: string
        Tty?: boolean
        Env?: string[]
        Cmd: string[] | string
        Privileged?: boolean
        User?: string
        WorkingDir?: string
    }

    export interface ExecResizeParameters {
        h: number
        w: number
    }

    export interface ExecDetail {
        CanRemove: boolean
        DetachKeys: string
        ID: string
        Running: boolean
        ExitCode: number
        ProcessConfig: {
            privileged: boolean
            user: string
            tty: boolean
            entrypoint: string
            arguments: string[]
        }
        OpenStdin: boolean
        OpenStdout: boolean
        OpenStderr: boolean
        ContainerID: string
        Pid: number
    }

    export interface NetworkFilter {
        dangling?: ('true' | 'false')[]
        driver?: string[]
        id?: string[]
        label?: string[]
        name?: string[]
        scope?: ('swarm' | 'global' | 'local')[]
        type?: ('custom' | 'builtin')[]
    }

    export interface NetworkDetail {
        Name: string
        Id: string
        Created: string
        Scope: string
        Driver: string
        EnableIpv6: boolean
        Internal: boolean
        Attachable: boolean
        Ingress: boolean
        IPAM: {
            Driver: string
            Config: {
                Subnet: string
                IPRange: string
                Gateway: string
                AuxiliaryAddresses?: { [key: string]: string }
            }[]
            options?: { [key: string]: string }
        }
        ConfigFrom?: { Network: string }
        ConfigOnly?: boolean
        Containers?: { [key: string]: { Name: string, EndpointID: string, MacAddress: string, IPv4Address: string, IPv6Address: string } }
        Options?: { [key: string]: string }
        Labels?: { [key: string]: string }
        Peers?: { Name: string, IP: string }[]
    }

    export interface NetworkCreateParametersIPAMConfig {
        Subnet?: string
        IPRange?: string
        Gateway?: string
        AuxiliaryAddresses?: { [key: string]: string }
    }

    export interface NetworkCreateParameters {
        Name: string
        CheckDuplicate?: boolean
        Driver?: string
        Scope?: string
        Internal?: boolean
        Attachable?: boolean
        Ingress?: boolean
        ConfigOnly?: boolean
        ConfigFrom?: { Network: string }
        IPAM?: {
            Driver?: string
            Config?: NetworkCreateParametersIPAMConfig[]
            Options?: { [key: string]: string }
        }
        EnableIPv6?: boolean
        Options?: { [key: string]: string }
        Labels: { [key: string]: string }
    }

    export interface NetworkEndpointConfig {
        IPAMConfig?: {
            IPv4Address?: string
            IPv6Address?: string
            LinkLocalIPs?: string[]
        }
        Links?: string[]
        Aliases?: string[]
        NetworkID?: string
        EndpointID?: string
        Gateway?: string
        IPAddress?: string
        IPPrefixLen?: number
        IPv6Gateway?: string
        GlobalIPv6Address?: string
        GlobalIPv6PrefixLen?: number
        MacAddress?: string
        DriverOpts?: { [key: string]: string }
    }

    export interface VolumeFilter {
        dangling?: ('true' | 'false')[]
        driver?: string[]
        label?: string[]
        name?: string[]
    }

    export interface VolumeCreateParameters {
        Name: string
        Driver?: string
        DriverOpts?: { [key: string]: string }
        Labels: { [key: string]: string }
    }

    export interface VolumeDetail {
        Name: string
        Driver: string
        Mountpoint: string
        Labels: { [key: string]: string }
        Scope: string
        Options: { [key: string]: string }
        Status?: { [key: string]: string }
        CreatedAt?: string
        UsageData?: {
            Size: number
            RefCount: number
        }
    }

    export interface DistributionDetail {
        Descriptor: {
            mediaType: string
            digest: string
            size: number
        }
        Platforms: {
            architecture: string
            os: string
            variant: string
        }[]
    }

    export interface VersionInformation {
        Platform: {
            Name: string
        },
        Components: {
            Name: string
            Version: string
            Details: Record<string, string>
        }[]
        Version: string
        ApiVersion: string
        MinAPIVersion: string
        GitCommit: string
        GoVersion: string
        Os: string
        Arch: string
        KernelVersion: string
        Experimental: string
        BuildTime: string
    }

    export interface EventFilter {
        config?: string[]
        container?: string[]
        daemon?: string[]
        event?: string[]
        image?: string[]
        label?: string[]
        network?: string[]
        node?: string[]
        plugin?: string[]
        scope?: string[]
        secret?: string[]
        service?: string[]
        type?: string[]
        volume?: string[]
    }

    export interface EventDetail {
        Type: 'builder' | 'config' | 'container' | 'daemon' | 'image' | 'network' | 'node' | 'plugin' | 'secret' | 'service' | 'volume'
        Action: string
        Actor: {
            ID: string
            Attributes: { [key: string]: string }
        }
        scope: 'local' | 'swarm'
        /**
         * @type integer
         */
        time: number
        /**
         * @type integer
         */
        timeNano: number
    }
}
