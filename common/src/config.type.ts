export type FileType = 'file' | 'directory' | 'block' | 'character' | 'link' | 'fifo' | 'socket' | 'unknown'

export interface FileDesc {
    type: FileType
    name: string
    mtimeMs: number
    size: number
}
