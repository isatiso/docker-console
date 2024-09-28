export type NdcResponse<T> = {
    status: 'success'
    data: T
} | {
    status: 'error'
    code: number
    message: string
}
