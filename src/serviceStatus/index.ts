import startApiStatus from './apiStatus.js'
import { buildCombinedHandler } from '../util/statusPoll.js'

export const startStatusHandlers = async () => {
  const handlers = new Map()
  const [apiStatus] = await Promise.all([startApiStatus()])
  handlers.set('api', apiStatus)

  return buildCombinedHandler(handlers)
}