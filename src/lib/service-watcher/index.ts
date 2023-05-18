import { singleton } from 'tsyringe'
import startApiStatus from './apiStatus'
import startIpfsStatus from './ipfsStatus'
import { buildCombinedHandler, SERVICE_STATE, Status } from './statusPoll'

@singleton()
export class ServiceWatcher {
  handlersP: Promise<{
    readonly status: SERVICE_STATE
    readonly detail: {
      [k: string]: Status
    }
  }>

  constructor() {
    this.handlersP = this.build()
  }

  private build = async (): Promise<{
    readonly status: SERVICE_STATE
    readonly detail: {
      [k: string]: Status
    }
  }> => {
    const handlers = new Map()
    const [apiStatus, ipfsStatus] = await Promise.all([startApiStatus(), startIpfsStatus()])
    handlers.set('api', apiStatus)
    handlers.set('ipfs', ipfsStatus)

    return buildCombinedHandler(handlers)
  }

  public get status(): Promise<SERVICE_STATE> {
    return this.handlersP.then(({ status }) => status)
  }

  public get detail() {
    return this.handlersP.then(({ detail }) => detail)
  }
}
