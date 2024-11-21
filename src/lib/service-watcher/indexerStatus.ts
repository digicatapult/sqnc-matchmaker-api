import { container } from 'tsyringe'
import Indexer from '../indexer/index.js'
import env from '../../env.js'
import { startStatusHandler } from './statusPoll.js'
const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env

const startIndexerStatus = () => {
  const indexer = container.resolve<Indexer>('Indexer')
  startStatusHandler({
    getStatus: indexer.getStatus.bind(indexer),
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })
}

export default startIndexerStatus
