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
     * Path to the shared data directory
     * default: '/docker-console'
     */
    data_path: string
    /**
     * Limit of the origin data size before download
     * default: 0
     */
    download_limit: number
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
