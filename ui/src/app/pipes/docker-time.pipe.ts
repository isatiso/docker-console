import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'dockerTime'
})
export class DockerTimePipe implements PipeTransform {

    /**
     * convert a millisecond timestamp to a docker ps style time string
     *
     * such as 'Up 36 minutes'
     * Up 5 days
     * Exited (0) 44 hours ago
     */
    transform(value: number): unknown {
        const seconds = Math.floor(value / 1000)
        if (seconds === 0) {
            return 'Less than a second'
        }
        if (seconds === 1) {
            return '1 second'
        }
        if (seconds < 60) {
            return `${seconds} seconds`
        }
        const minutes = Math.floor(seconds / 60)
        if (minutes === 1) {
            return 'About a minute'
        }
        if (minutes < 60) {
            return `${minutes} minutes`
        }
        const hours = Math.floor(minutes / 60)
        if (hours === 1) {
            return 'About an hour'
        }
        if (hours < 24) {
            return `${hours} hours`
        }
        const days = Math.floor(hours / 24)
        if (days === 1) {
            return 'About one day'
        }
        if (days < 30) {
            return `${days} days`
        }
        const months = Math.floor(days / 30)
        if (months === 1) {
            return 'About one month'
        }
        if (months < 30) {
            return `${months} months`
        }
        const years = Math.floor(months / 12)
        if (years === 1) {
            return 'About one year'
        }
        return `${years} years`
    }

}
