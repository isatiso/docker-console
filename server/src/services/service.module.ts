import { TpModule } from '@tarpit/core'
import { HttpHooks } from '@tarpit/http'
import { ScheduleHooks } from '@tarpit/schedule'
import { DockerService } from './docker.service'
import { DownloadService } from './download.service'
import { NdcFileService } from './file.service'
import { NdcHttpHooks } from './http-hooks'
import { ManagerService } from './manager.service'
import { NdcScheduleHooks } from './schedule-hooks'

@TpModule({
    imports: [],
    providers: [
        { provide: HttpHooks, useClass: NdcHttpHooks },
        { provide: ScheduleHooks, useClass: NdcScheduleHooks },
        DockerService,
        NdcFileService,
        ManagerService,
        DownloadService,
    ],
})
export class ServiceModule {
}
