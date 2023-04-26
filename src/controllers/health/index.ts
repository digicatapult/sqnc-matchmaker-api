import { Controller, Get, Response, Route, SuccessResponse } from 'tsoa'
import type { Health } from '../../models'
import { logger } from '../../lib/logger'
import { startStatusHandlers } from '../../lib/ServiceWatcher/index'
import { serviceState } from '../../lib/ServiceWatcher/statusPoll'
import { ServiceUnavailable } from '../../lib/error-handler/index'

@Route('health')
export class health extends Controller {
  constructor() {
    super()
  }

  @Response<ServiceUnavailable>(503)
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
    const code = status === serviceState.UP ? 200 : 503

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
    if (serviceStatusStrings[status] == 'down') throw new ServiceUnavailable(code, response).sendResponse
    if (serviceStatusStrings[status] == 'error') throw new ServiceUnavailable(code, response).sendResponse
    return response
  }
}
