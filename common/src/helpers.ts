import { KeysOfType } from '@tarpit/type-tools'

declare global {
    interface Array<T> {
        last: T | undefined

        groupBy(keyFn: (n: T) => string | number | symbol): Record<string | number | symbol, T[]>
    }
}

export type ObjectKeyType<T extends {}> = KeysOfType<T, string | number>

export function random_id() {
    return Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)
}

export function range(start: number, end: number) {
    start = Math.floor(start)
    end = Math.floor(end)
    if (start > end) {
        return new Array(start - end + 1).fill(0).map((_, i) => end + i).reverse()
    } else {
        return new Array(end - start + 1).fill(0).map((_, i) => start + i)
    }
}

export function make_object<T extends {}>(arr: T[], key: ObjectKeyType<T>): Record<string, T>
export function make_object<T extends {}, K extends keyof T>(arr: T[], key: ObjectKeyType<T>, value_key: K): Record<string, T[K]>
export function make_object<T extends {}, R>(arr: T[], key: ObjectKeyType<T>, project: (value: T) => R): Record<string, R>
export function make_object<T extends {}, R>(arr: T[], key: ObjectKeyType<T>, project?: keyof T | ((value: T) => R)): any {
    if (typeof project === 'function') {
        return Object.fromEntries(arr.map(n => ([n[key], project(n) ?? n])))
    } else if (project) {
        return Object.fromEntries(arr.map(n => ([n[key], n[project]])))
    } else {
        return Object.fromEntries(arr.map(n => ([n[key], n])))
    }
}

export function deep_equal(a: any, b: any, ignore_keys?: string[], debug?: boolean) {
    if (typeof a !== typeof b) {
        return false
    }
    if (a === null || typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean' || typeof a === 'undefined') {
        return a === b
    } else if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false
        }
        for (let i = 0; i < a.length; i++) {
            if (!deep_equal(a[i], b[i], ignore_keys, debug)) {
                return false
            }
        }
        return true
    } else if (typeof a === 'object' && typeof b === 'object') {
        const aKeys = Object.keys(a).filter(key => !ignore_keys?.includes(key))
        const bKeys = Object.keys(b).filter(key => !ignore_keys?.includes(key))
        if (aKeys.length !== bKeys.length) {
            return false
        }
        for (const key of aKeys) {
            if (!deep_equal(a[key], b[key], ignore_keys, debug)) {
                return false
            }

        }
        return true
    } else {
        return false
    }
}

export function group_by<T>(list: T[], keyFn: (n: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {}
    for (const item of list) {
        const key = keyFn(item)
        if (!result[key]) {
            result[key] = []
        }
        result[key].push(item)
    }
    return result
}

if (!Array.prototype.hasOwnProperty('groupBy')) {
    Object.defineProperty(Array.prototype, 'groupBy', {
        value: function(this: any, keyFn: (n: any) => string) {
            return group_by(this, keyFn)
        }
    })
}

if (!Array.prototype.hasOwnProperty('last')) {
    Object.defineProperty(Array.prototype, 'last', {
        get: function(this: any) {
            return this[this.length - 1]
        },
    })
}
