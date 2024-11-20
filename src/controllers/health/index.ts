import { inject, injectable } from 'tsyringe'
import { Controller, Get, Response, Route, SuccessResponse, Hidden } from 'tsoa'

import type { Health } from '../../models/health.js'
import { logger } from '../../lib/logger.js'
import { serviceState } from '../../lib/service-watcher/statusPoll.js'
import { ServiceUnavailable } from '../../lib/error-handler/index.js'
import { ServiceWatcher } from '../../lib/service-watcher/index.js'
import Indexer from '../../lib/indexer/index.js'

const packageVersion = process.env.npm_package_version ? process.env.npm_package_version : 'unknown'

const serviceStatusStrings = {
  [serviceState.UP]: 'ok',
  [serviceState.DOWN]: 'down',
  [serviceState.ERROR]: 'error',
}

@Route('health')
@injectable()
export class HealthController extends Controller {
  constructor(
    private serviceWatcher: ServiceWatcher,
    @inject('Indexer') private indexer: Indexer
  ) {
    super()
  }

  @Response<ServiceUnavailable>(503)
  @SuccessResponse(200)
  @Hidden()
  @Get('/')
  public async get(): Promise<Health> {
    logger.debug({ msg: 'new request received', controller: '/health' })

    const status = await this.serviceWatcher.status
    const details = await this.serviceWatcher.detail

    const { startupTime, lastProcessedBlockTime, lastUnprocessedBlockTime } =
      await this.indexer.retrieveBlockProcessingTimes()

    const currentDate = new Date()
    let wasLastProcessedBlockMoreThan30sAgo: boolean = false // healthy

    if (lastProcessedBlockTime !== null) {
      // if we have already started processing blocks check if the last was within 30s
      const differenceInMilliseconds = currentDate.getTime() - lastProcessedBlockTime.getTime()
      // if isMoreThan30Seconds is true -> will be unhealthy
      wasLastProcessedBlockMoreThan30sAgo = differenceInMilliseconds > 30 * 1000
    } else if (lastUnprocessedBlockTime !== null) {
      // if we are still catching up on old blocks check if last was within 30s
      const differenceInMilliseconds = currentDate.getTime() - lastUnprocessedBlockTime.getTime()
      // if isMoreThan30Seconds is true -> will be unhealthy
      wasLastProcessedBlockMoreThan30sAgo = differenceInMilliseconds > 30 * 1000
    } else if (currentDate.getTime() - startupTime.getTime() > 30 * 1000) {
      // if no blocks have been processed and we are not catching up on blocks
      // and we have started more than 30s ago -> unhealthy
      wasLastProcessedBlockMoreThan30sAgo = true
    } else {
      // must be healthy
    }

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
      lastProcessedBlockMoreThan30sAgo: wasLastProcessedBlockMoreThan30sAgo,
    }
    if (status !== serviceState.UP) {
      logger.debug('Service unavailable: %j', response)
      throw new ServiceUnavailable(503, response)
    }
    return response
  }
}
