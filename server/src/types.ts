export interface AWS_DockerRepo {
    type: 'aws'
    host: string
    alias: string[]
    region: string
    access_key_id: string
    secret_access_key: string
}

export interface NdcConfiguration {
    /**
     * Port to listen on
     * default: 7293
     * @minimum 3000
     */
    port: number
    /**
     * Path to the application directory
     * default: '/app'
     */
    app_path: string
    /**
     * Path to the configuration directory
     * default: '/etc/docker-console'
     */
    config_path: string
    /**
     * Path to the shared data directory
     * default: '/usr/local/share/docker-console'
     */
    data_path: string
    /**
     * Path to the log directory
     * default: '/var/log'
     */
    log_path: string
    /**
     * Log level
     */
    log_level: 'debug' | 'info' | 'warn' | 'error'
    /**
     * Path to the docker unix_socket file
     * default: '/var/run/docker.sock'
     */
    socket_path: string
    /**
     * Docker repositories
     * Only support AWS ECR for now
     */
    docker_repo: AWS_DockerRepo[]
}

export type OptionalNdcConfiguration = Partial<NdcConfiguration>
