import Indexer from '../indexer/index.js'
import env from '../../env.js'
import { startStatusHandler } from './statusPoll.js'
import Database from '../db/index.js'
import ChainNode from '../chainNode.js'
import { logger } from '../logger.js'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env
const node = new ChainNode(logger, env)
const indexer = new Indexer({ db: new Database(), logger, node, startupTime: new Date(), env })

const startIndexerStatus = () =>
  startStatusHandler({
    getStatus: indexer.getStatus.bind(indexer),
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startIndexerStatus
