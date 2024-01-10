import { startStatusHandler } from './statusPoll.js'
import env from '../../env.js'
import Identity from '../services/identity.js'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env

const identity = new Identity()

const startIdentityStatus = () =>
  startStatusHandler({
    getStatus: identity.getStatus.bind(identity),
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startIdentityStatus
