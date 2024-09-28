export interface FileDesc {
    type: 'file' | 'dir' | 'other'
    name: string
    mtimeMs: number
    size: number
}
