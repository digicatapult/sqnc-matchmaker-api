import Indexer from '../indexer/index.js'
import env from '../../env.js'
import { startStatusHandler } from './statusPoll.js'
import Database from '../db/index.js'
import ChainNode from '../chainNode.js'
import { logger } from '../logger.js'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env
const node = new ChainNode({
  host: env.NODE_HOST,
  port: env.NODE_PORT,
  logger,
  userUri: env.USER_URI,
})
const indexer = new Indexer({ db: new Database(), logger, node, startupTime: new Date() })

const startIndexerStatus = () =>
  startStatusHandler({
    getStatus: indexer.getStatus.bind(indexer),
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startIndexerStatus
