import { Injectable } from '@angular/core'

@Injectable({
    providedIn: 'root'
})
export class ToolsService {
    constructor() {
    }

    base64_encode(str: string) {
        const bytes = new TextEncoder().encode(str)
        const bin = String.fromCharCode(...bytes)
        return btoa(bin)
    }

    base64_decode(b64_str: string) {
        const bin = atob(b64_str)
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
        return new TextDecoder().decode(bytes)
    }
}
