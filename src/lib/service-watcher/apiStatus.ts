import { startStatusHandler } from './statusPoll.js'
import env from '../../env.js'
import ChainNode from '../chainNode.js'
import { logger } from '../logger.js'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env
const node = new ChainNode({
  host: env.NODE_HOST,
  port: env.NODE_PORT,
  logger,
  userUri: env.USER_URI,
})

const startApiStatus = () =>
  startStatusHandler({
    getStatus: node.getStatus,
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startApiStatus
