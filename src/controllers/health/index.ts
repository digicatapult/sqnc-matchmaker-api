import { Controller, Get, Route, SuccessResponse } from 'tsoa'

import type { Health } from '../../models'
import { logger } from '../../lib/logger'
import { startStatusHandlers } from '../../lib/ServiceWatcher/index'
import { serviceState } from '../../lib/util/statusPoll'

@Route('health')
export class health extends Controller {
  constructor() {
    super()
  }

  @SuccessResponse(200)
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
    const response: Health = {
      status: serviceStatusStrings[status] || 'error',
      version: process.env.npm_package_version ? process.env.npm_package_version : 'unknown',
      details: Object.fromEntries(
        Object.entries(details).map(([depName, { status, detail }]) => {
          const data = JSON.stringify(detail)
          return [
            depName,
            {
              status: serviceStatusStrings[status] || 'error',
              detail: data,
            },
          ]
        })
      ),
    }
    return response
  }
}
