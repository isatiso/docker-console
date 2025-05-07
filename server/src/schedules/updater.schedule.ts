import { Disabled } from '@tarpit/core'
import { Task, TpSchedule } from '@tarpit/schedule'

import { ManagerService } from '../services/manager.service'

@TpSchedule()
export class UpdaterSchedule {

    constructor(
        private manager: ManagerService,
    ) {
    }

    @Disabled()
    @Task('17 3 * * *', 'Download Latest Config')
    async download_latest_config() {
        // this.manager.update_version$.next()
    }

    @Disabled()
    @Task('*/5 * * * *', 'Update Config from local file')
    async load_config() {
        // await this.file.load_station_config()
    }
}
