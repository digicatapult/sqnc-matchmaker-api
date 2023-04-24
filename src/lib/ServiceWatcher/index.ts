import startApiStatus from './apiStatus'
import { buildCombinedHandler } from '../util/statusPoll'

export const startStatusHandlers = async () => {
  const handlers = new Map()
  const [apiStatus] = await Promise.all([startApiStatus()])
  handlers.set('api', apiStatus)

  return buildCombinedHandler(handlers)
}
