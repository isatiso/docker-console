import { Injectable } from '@angular/core'

export type SessionStorage = {
    'ndc.editor-title': string
    'ndc.editor-content': string
}

export type LocalStorage = {}

class FakeStorage implements Storage {

    private _cache: Record<string, string> = {}

    get length() {
        return Object.keys(this._cache).length
    }

    clear(): void {
        this._cache = {}
    }

    key(index: number): string | null {
        throw new Error('Method not implemented.')
    }

    setItem(key: string, value: string): void {
        this._cache[key] = value
    }

    getItem(key: string): string | null {
        return this._cache[key] ?? null
    }

    removeItem(key: string): void {
        delete this._cache[key]
    }
}

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    public readonly session: Storage = typeof sessionStorage === 'object' ? sessionStorage : new FakeStorage()
    public readonly local: Storage = typeof localStorage === 'object' ? localStorage : new FakeStorage()

    constructor() {
    }

    set_session<T extends keyof SessionStorage>(key: T, value: SessionStorage[T]): void {
        this.set_item(this.session, key, value)
    }

    get_session<T extends keyof SessionStorage>(key: T): SessionStorage[T] {
        return this.get_item(this.session, key)
    }

    remove_session<T extends keyof SessionStorage>(key: T): void {
        return this.session.removeItem(key)
    }

    set_local<T extends keyof LocalStorage>(key: T, value: LocalStorage[T]): void {
        this.set_item(this.local, key, value)
    }

    get_local<T extends keyof LocalStorage>(key: T): LocalStorage[T] {
        return this.get_item(this.local, key)
    }

    remove_local<T extends keyof LocalStorage>(key: T): void {
        return this.local.removeItem(key)
    }

    private get_item(storage: Storage, key: string) {
        try {
            return JSON.parse(storage.getItem(key) ?? '')
        } catch (e) {
            return undefined
        }
    }

    private set_item(storage: Storage, key: string, value: any) {
        return storage.setItem(key, JSON.stringify(value))
    }
}
