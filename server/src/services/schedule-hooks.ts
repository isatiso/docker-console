import { TpService } from '@tarpit/core'
import { ScheduleHooks, TaskContext, TaskCrash, TaskError, TaskIgnore, TaskRetry } from '@tarpit/schedule'

function assemble_duration(context: TaskContext<{ process_start: number }>) {
    const start = context.get('process_start')
    return start ? Date.now() - start : -1
}

@TpService({ inject_root: true })
export class NdcScheduleHooks extends ScheduleHooks {

    constructor() {
        super()
    }

    async write_execute_log(context: TaskContext<{ process_start: number }>, duration: number, err?: TaskError) {
        const duration_str = `${duration}ms`.padStart(12)
        if (err instanceof TaskRetry) {
            const type = 'retry    '
            logger.info(`${duration_str} ${type} ${context.unit.task_name} <${err.code} ${err.msg}, failed ${context.count} times>`)
        } else if (err instanceof TaskCrash) {
            const type = 'crash    '
            logger.error(`${duration_str} ${type} ${context.unit.task_name} <${err.code} ${err.msg}>`)
        } else if (err instanceof TaskIgnore) {
            const type = 'ignore   '
            logger.info(`${duration_str} ${type} ${context.unit.task_name} <${err.code} ${err.msg}>`)
        } else {
            const type = 'success  '
            logger.info(`${duration_str} ${type} ${context.unit.task_name}`)
        }
    }

    override async on_init(context: TaskContext<{ process_start: number }>): Promise<void> {
        context.set('process_start', Date.now())
    }

    override async on_finish<T>(context: TaskContext<{ process_start: number }>, res: T): Promise<void> {
        const duration = assemble_duration(context)
        await this.write_execute_log(context, duration)
    }

    override async on_error(context: TaskContext<{ process_start: number }>, err: any): Promise<void> {
        const duration = assemble_duration(context)
        await this.write_execute_log(context, duration, err)
    }
}
