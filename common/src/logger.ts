export function log_error(message: string) {
    // @ts-ignore
    if (typeof global === 'object') {
        // @ts-ignore
        global.logger?.error(message)
    } else {
        console.error(message)
    }
}

export function log_info(message: string) {
    // @ts-ignore
    if (typeof global === 'object') {
        // @ts-ignore
        global.logger?.info(message)
    } else {
        console.info(message)
    }
}

export function log_warn(message: string) {
    // @ts-ignore
    if (typeof global === 'object') {
        // @ts-ignore
        global.logger?.warn(message)
    } else {
        console.warn(message)
    }
}
