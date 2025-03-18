import { startStatusHandler } from './statusPoll.js'
import env from '../../env.js'
import ChainNode from '../chainNode.js'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env

const startApiStatus = () =>
  startStatusHandler({
    getStatus: ChainNode.getStatus,
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startApiStatus
