import { startStatusHandler } from './statusPoll'
import env from '../../env'
import IdentityClass from '../services/identity'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env

const identityClass = new IdentityClass()

const startIdentityStatus = () =>
  startStatusHandler({
    getStatus: identityClass.getStatus.bind(identityClass),
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startIdentityStatus
