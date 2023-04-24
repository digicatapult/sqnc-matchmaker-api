import { Controller, Get, Route } from 'tsoa'

import type { Health } from '../../models'
import { logger } from '../../lib/logger'
import { startStatusHandlers } from '../../lib/ServiceWatcher/index'
import { serviceState } from '../../lib/util/statusPoll'

@Route('health')
export class health extends Controller {
  constructor() {
    super()
  }

  @Get('/')
  public async get(): Promise<Health> {
    logger.debug({ msg: 'new request received', controller: '/health' })

    const serviceStatusStrings = {
      [serviceState.UP]: 'ok',
      [serviceState.DOWN]: 'down',
      [serviceState.ERROR]: 'error',
    }

    const statusHandler = await startStatusHandlers()
    const status = statusHandler.status
    const details = statusHandler.detail
    const code = status === serviceState.UP ? 200 : 503
    return Promise.resolve(
      status(code).send({
        version: process.env.npm_package_version ? process.env.npm_package_version : 'unknown',
        status: serviceStatusStrings[status] || 'error',
        details: Object.fromEntries(
          Object.entries(details).map(([depName, { status, detail }]) => [
            depName,
            {
              status: serviceStatusStrings[status] || 'error',
              detail,
            },
          ])
        ),
      })
    )
  }
}
