import { startStatusHandler } from './statusPoll.js'
import env from '../../env.js'
import Attachment from '../services/attachment.js'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env

const startAttachmentStatus = () =>
  startStatusHandler({
    getStatus: Attachment.getStatus,
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startAttachmentStatus
