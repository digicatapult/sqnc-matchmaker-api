import { startStatusHandler, serviceState } from '../../util/statusPoll'
import env from '../../../env'

const { IDENTITY_STATUS_POLL_PERIOD_MS, IDENTITY_STATUS_TIMEOUT_MS } = env

const getStatus = async () => {
    await 
}


const startIdentityStatus = () =>
  startStatusHandler({
    getStatus,
    pollingPeriodMs: IDENTITY_STATUS_POLL_PERIOD_MS,
    serviceTimeoutMs: IDENTITY_STATUS_TIMEOUT_MS,
  })

export default startIdentityStatus
