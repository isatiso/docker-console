export interface PullImageProgress {
    task_id: string
    image_tag: string
    status: 'queueing' | 'generate_token' | 'check_local' | 'check_remote' | 'pull_image' | 'completed' | 'aborted'
    local_exists?: boolean
    remote_exists?: boolean
    layers: string[]
    layer_status: Record<string, {
        id: string
        status: string
        current: number
        total: number
        progress_bar: string
    }>
    promise: Promise<void>
    on_fulfilled: (err?: any) => void
    created_at: number
    updated_at: number
}

export interface ContainerInformation {
    name: string
    health: string
    status: string
    image: string
    service: string
    aliases: string[]
    ip_address: string
    started_at: number
}
