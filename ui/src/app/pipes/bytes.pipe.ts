import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'bytes'
})
export class BytesPipe implements PipeTransform {

    transform(bytes: number): string {
        if (!bytes) {
            return '0 bytes'
        }
        const k = 1024
        const sizes = ['bytes', 'KB', 'MB', 'GB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
    }
}
