import Indexer from '../indexer/index.js'
import env from '../../env.js'
import { startStatusHandler } from './statusPoll.js'
import { container } from 'tsyringe'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env

const startIndexerStatus = () =>
  startStatusHandler({
    getStatus: async () => {
      if (env.ENABLE_INDEXER) {
        const indexer = container.resolve<Indexer>('Indexer')
        return indexer.getStatus()
      }
      return { status: 'up', detail: { status: 'Indexer is disabled' } }
    },
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startIndexerStatus
