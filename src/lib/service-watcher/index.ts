import startApiStatus from './apiStatus'
import startIpfsStatus from './ipfsStatus'
import { buildCombinedHandler } from './statusPoll'

export const startStatusHandlers = async () => {
  const handlers = new Map()
  const [apiStatus, ipfsStatus] = await Promise.all([startApiStatus(), startIpfsStatus()])
  handlers.set('api', apiStatus)
  handlers.set('ipfs', ipfsStatus)

  return buildCombinedHandler(handlers)
}
