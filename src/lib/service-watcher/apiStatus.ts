import { startStatusHandler } from './statusPoll.js'
import env from '../../env.js'
import ChainNode from '../chainNode.js'
import { container } from 'tsyringe'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env
const node = container.resolve(ChainNode)

const startApiStatus = () =>
  startStatusHandler({
    getStatus: node.getStatus,
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startApiStatus
