import { ajv } from '@docker-console/common'
import { load_config } from '@tarpit/config'
import { Injector, Platform, TpConfigData, TpConfigSchema } from '@tarpit/core'
import { HttpInspector, HttpServerModule } from '@tarpit/http'
import { ScheduleInspector, ScheduleModule } from '@tarpit/schedule'
import { Command, program } from 'commander'
import fs from 'node:fs'
import process from 'node:process'
import pino, { Logger } from 'pino'
import pretty from 'pino-pretty'
import package_json from './pkg.json'
import { DockerRouter } from './routers/docker.router'
import { FileRouter } from './routers/file.router'
import { ServiceRouter } from './routers/service.router'
import { StaticRouter } from './routers/static.router'
import { UpdaterSchedule } from './schedules/updater.schedule'
import schema from './schema/ndc.schema.json'
import { ServiceModule } from './services/service.module'
import { NdcConfiguration, OptionalNdcConfiguration } from './types'

declare global {
    export var logger: Logger<string>
}

declare module '@tarpit/core' {

    interface TpConfigSchema {
        ndc: NdcConfiguration
    }
}

program.name('Node Docker Console')
    .description('The Best Docker Console in Node.js')
    .version(package_json.version)

program.command('start')
    .description('Start Docker Console')
    .option('-c,--config-file <filepath>', 'The path of the configuration file.')
    .action(async (options: {
        configFile?: string
    }, _command: Command) => {
        const ndc_config_path = options.configFile ?? '/etc/docker-console/config.json'

        let parsed_data: OptionalNdcConfiguration
        if (fs.existsSync(ndc_config_path)) {
            const ndc_config_str = fs.readFileSync(ndc_config_path, 'utf-8')
            parsed_data = JSON.parse(ndc_config_str) as OptionalNdcConfiguration
        } else {
            parsed_data = {}
        }

        const ndc_config_data = parsed_data as NdcConfiguration

        ndc_config_data.log_path = parsed_data.log_path ?? '/var/log'
        ndc_config_data.app_path = parsed_data.app_path ?? '/app'
        ndc_config_data.config_path = parsed_data.config_path ?? '/etc/docker-console'
        ndc_config_data.data_path = parsed_data.data_path ?? '/docker-console'
        ndc_config_data.socket_path = parsed_data.socket_path ?? '/var/run/docker.sock'
        ndc_config_data.port = parsed_data.port ?? 7293
        ndc_config_data.docker_repo = parsed_data.docker_repo ?? []
        ndc_config_data.log_level = ndc_config_data.log_level ?? 'info'

        // TODO: validate ndc_config_data

        // maybe get config from file or config center
        // ndc: {
        //     docker_repo: [
        //         {
        //             host: '854156987822.dkr.ecr.us-east-1.amazonaws.com',
        //             alias: ['dkr.prod.cov.xyz'],
        //             region: 'us-east-1',
        //             type: 'aws',
        //             access_key_id: process.env.AWS_ACCESS_KEY_ID ?? '',
        //             secret_access_key: process.env.AWS_SECRET_ACCESS_KEY ?? '',
        //         }
        //     ]
        // },
        const raw_config_data: TpConfigSchema = {
            ndc: ndc_config_data,
            http: {
                expose_error: true,
                port: ndc_config_data.port,
                cors: {
                    allow_methods: 'GET,POST,PUT,DELETE,HEAD',
                    allow_headers: '*',
                    allow_origin: '*',
                    max_age: 0,
                },
                static: {
                    root: './ndc',
                    cache_control: {
                        'max-age': 86400,
                        'no-cache': true,
                    },
                },
            }
        }

        const validate = ajv.compile(schema)
        if (!validate(raw_config_data)) {
            console.log(`config data ${raw_config_data} is invalid: ${ajv.errorsText(validate.errors)}`)
            console.log(JSON.stringify(raw_config_data, null, 4))
            process.exit(1)
        }

        const config_data = load_config<TpConfigSchema>(raw_config_data)
        const log_file = 'docker-console.log'
        const log_path = config_data.get('ndc.data_path') + '/log'

        fs.mkdirSync(log_path, { recursive: true })
        fs.mkdirSync(config_data.get('ndc.data_path') + '/projects', { recursive: true })
        fs.mkdirSync(config_data.get('ndc.data_path') + '/data', { recursive: true })

        const logger_fd = fs.openSync(`${log_path}/${log_file}`, 'a')
        const logger: Logger<string> = pino({ level: ndc_config_data.log_level }, pino.multistream([
            {
                level: ndc_config_data.log_level,
                stream: pretty({
                    destination: 1,
                    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l',
                    sync: false,
                    ignore: 'pid,hostname',
                })
            },
            {
                level: ndc_config_data.log_level,
                stream: pretty({
                    destination: logger_fd,
                    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l',
                    sync: false,
                    ignore: 'pid,hostname',
                }),
            },
        ]))

        global.logger = logger

        const platform = new Platform(config_data)
            .import(HttpServerModule)
            .import(ScheduleModule)
            .import(ServiceModule)
            .import(DockerRouter)
            .import(StaticRouter)
            .import(FileRouter)
            .import(ServiceRouter)
            .import(UpdaterSchedule)

        const c = platform.expose(TpConfigData)
        if (c) {
            logger.debug('Configuration: %O', c.get())
        }
        const routes = platform.expose(HttpInspector)?.list_router()
        if (routes?.length) {
            logger.debug('HTTP routes:')
            routes.forEach(item => logger.debug(`   %s %s`, item.method.padEnd(7, ' '), item.path))
        }
        const tasks = platform.expose(ScheduleInspector)?.list_task()
        if (tasks?.length) {
            logger.debug('Schedule tasks:')
            tasks.forEach(item => logger.debug(`    %s %s`, item.crontab.padEnd(20, ' '), item.name))
        }
        platform.expose(Injector)?.on('terminate', () => {
            setTimeout(() => process.exit(0), 500)
        })
        process.on('uncaughtException', err => {
            logger.error(`Caught unhandled exception: ${err} ${err.stack}`)
        })
        process.on('SIGINT', () => {
            logger.info('Caught interrupt signal')
            platform.terminate()
            setTimeout(() => process.exit(0), 1000)
        })
        process.on('SIGTERM', () => {
            logger.info('Caught terminate signal')
            platform.terminate()
            setTimeout(() => process.exit(0), 1000)
        })
        platform.start()
    })

program.parse()
