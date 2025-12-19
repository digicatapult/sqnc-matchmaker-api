import { inject, injectable } from 'tsyringe'
import { Controller, Get, Response, Route, SuccessResponse, Hidden } from 'tsoa'

import type { Health } from '../../models/health.js'
import { LoggerToken } from '../../lib/logger.js'
import { serviceState } from '../../lib/service-watcher/statusPoll.js'
import { ServiceUnavailable } from '../../lib/error-handler/index.js'
import { ServiceWatcher } from '../../lib/service-watcher/index.js'
import { type Logger } from 'pino'

const packageVersion = process.env.npm_package_version ? process.env.npm_package_version : 'unknown'

const serviceStatusStrings = {
  [serviceState.UP]: 'ok',
  [serviceState.DOWN]: 'down',
  [serviceState.ERROR]: 'error',
}

@Route('health')
@injectable()
export class HealthController extends Controller {
  protected logger: Logger
  constructor(
    private serviceWatcher: ServiceWatcher,
    @inject(LoggerToken) logger: Logger
  ) {
    super()
    this.logger = logger.child({ module: 'HealthController' })
  }

  @Response<ServiceUnavailable>(503)
  @SuccessResponse(200)
  @Hidden()
  @Get('/')
  public async get(): Promise<Health> {
    this.logger.debug({ msg: 'new request received', controller: '/health' })

    const status = await this.serviceWatcher.status
    const details = await this.serviceWatcher.detail

    const response: Health = {
      status: serviceStatusStrings[status] || 'error',
      version: packageVersion,
      details:
        details &&
        Object.fromEntries(
          Object.entries(details).map(([depName, { status, detail }]) => {
            return [
              depName,
              {
                status: serviceStatusStrings[status] || 'error',
                detail: detail,
              },
            ]
          })
        ),
    }
    if (status !== serviceState.UP) {
      this.logger.debug('Service unavailable: %j', response)
      throw new ServiceUnavailable(503, response)
    }
    return response
  }
}
