import { catchError, concat, delay, filter, find, map, Observable, of, switchMap, tap, timeout, TimeoutError, timer } from 'rxjs'
import { log_error, log_info, log_warn } from './logger'

export function stringifyError(err: any) {
    if (err instanceof Error) {
        return `${err}`
    }
    const t = typeof err
    if (t === 'object') {
        if (err.constructor) {
            return `${err.valueOf()}`
        } else {
            return JSON.stringify(err)
        }
    } else if (t === 'function') {
        return `function ${err.name}`
    } else {
        return `${err}`
    }
}

export function filterNonNullable<T>(): (source: Observable<T>) => Observable<Exclude<T, null | undefined>> {
    return filter((value): value is Exclude<T, null | undefined> => value !== null && value !== undefined)
}

export function throwIf<T>(condition: (value: T) => boolean, message?: string): (source: Observable<T>) => Observable<T> {
    return tap(value => {
        if (condition(value)) {
            throw new Error('Condition not matched: ' + (message ?? ''))
        }
    })
}

export function muteError<T>(): (source: Observable<T>) => Observable<T | null> {
    return catchError<T, Observable<null>>(() => of(null))
}

export function filterOutError(on_error?: (err: any) => void): <T>(source: Observable<T>) => Observable<T> {
    return catchError(err => {
        on_error?.(err)
        return of()
    })
}

export function logError<T>(prompt?: string): (source: Observable<T>) => Observable<T> {
    return catchError(err => {
        log_warn(`${prompt ?? 'Error occurred'}: ${err}`)
        throw err
    })
}

export function throwSource<T>(): (source: Observable<T>) => Observable<never> {
    return tap(err => {
        throw new Error(`throwSource: ${stringifyError(err)}`)
    }) as any
}

export function preventIdle<T>(period: number): (source: Observable<T>) => Observable<T> {
    return switchMap((source: T) => concat(
        of(source),
        timer(period, period).pipe(map(() => source)),
    ))
}

interface NodeStyleEventEmitter {
    addListener(eventName: string | symbol, handler: (...args: any[]) => void): this

    removeListener(eventName: string | symbol, handler: (...args: any[]) => void): this
}

export function fromNodeEvent<T>(target: NodeStyleEventEmitter, event: string | symbol): Observable<T> {
    return new Observable<T>(subscriber => {
        const handler = (...args: any) => subscriber.next(args)
        target.addListener(event, handler)
        return () => target.removeListener(event, handler)
    })
}

export function onDormant<T>(delay_ms: number, selector: T | ((source: T) => T)): (source: Observable<T>) => Observable<T> {
    return switchMap((source: T) => concat(
        of(source),
        of(source).pipe(
            delay(delay_ms),
            map(s => selector === 'function' ? (selector as Function)(s) : selector),
        )
    ))
}

export function diff<T extends {}>(): (source: Observable<T>) => Observable<Partial<T>> {
    let prev: T
    return map(source => {
        if (!prev) {
            prev = source
            return source
        } else {
            const changes: Partial<T> = {}
            Array.from(new Set([...Object.keys(source), ...Object.keys(prev)])).forEach(key => {
                if (source[key as keyof T] !== prev[key as keyof T]) {
                    changes[key as keyof T] = source[key as keyof T]
                }
            })
            prev = source
            return changes
        }
    })
}

export function waitingFor(condition: () => boolean, options?: {
    interval_ms?: number
    prompt?: string
    log_prefix?: string
    timeout_ms?: number
    on_error?: (err: any) => void
    throw_error?: boolean
}): <T>(source: Observable<T>) => Observable<T> {
    const interval_ms = options?.interval_ms ?? 100
    const prompt = options?.prompt ? options.prompt + ' ' : ''
    const log_prefix = options?.log_prefix ? `[${options.log_prefix}] ` : ''
    const timeout_ms = options?.timeout_ms ?? 0
    const log_strategy = (duration_ms: number) => {
        if (duration_ms > 1000 * 60 * 60) {
            if (duration_ms % (1000 * 60 * 60) < interval_ms) {
                return `${log_prefix}Waiting for ${prompt}${Math.floor(duration_ms / (1000 * 60 * 60))} hours`
            }
        } else if (duration_ms > 1000 * 60) {
            if (duration_ms % (1000 * 60) < interval_ms) {
                return `${log_prefix}Waiting for ${prompt}${Math.floor(duration_ms / (1000 * 60))} minutes`
            }
        } else if (duration_ms > 1000) {
            if (duration_ms % 1000 < interval_ms) {
                return `${log_prefix}Waiting for ${prompt}${Math.floor(duration_ms / 1000)} seconds`
            }
        }
        return null
    }
    return switchMap(event => {
        const start = Date.now()
        log_info(`${log_prefix}Start waiting ${prompt || ''}`)
        return timer(0, interval_ms).pipe(
            tap(() => {
                const content = log_strategy(Date.now() - start)
                if (content) {
                    log_info(content)
                }
            }),
            find(() => condition()),
            timeout_ms ? timeout({ first: timeout_ms }) : tap(),
            catchError(err => {
                if (err instanceof TimeoutError) {
                    log_error(`${log_prefix}Timeout: waiting for ${prompt}${timeout_ms}ms`)
                } else {
                    log_error(`${log_prefix}Error occurred when waiting for ${prompt}: ${stringifyError(err)}`)
                }
                options?.on_error?.(err)
                if (options?.throw_error) {
                    throw err
                }
                return of()
            }),
            map(() => {
                log_info(`${log_prefix}Finish waiting for ${prompt}`)
                return event
            }),
        )
    })
}
