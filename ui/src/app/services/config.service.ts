import { Injectable } from '@angular/core'

@Injectable({
    providedIn: 'root'
})
export class ConfigService {

    version = ''
    container_id = ''

    constructor() {
    }
}
