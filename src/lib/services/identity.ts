import { NotFound, HttpResponse } from '../error-handler'
import env from '../../env'
import { Status, serviceState } from '../service-watcher/statusPoll'

const URL_PREFIX = `http://${env.IDENTITY_SERVICE_HOST}:${env.IDENTITY_SERVICE_PORT}`

export default class IdentityClass {
  constructor() {}

  getStatus = async (): Promise<Status> => {
    try {
      const res = await getHealth()
      if (res) {
        if (!res.version.match(/\d+.\d+.\d+/)) {
          return {
            status: serviceState.DOWN,
            detail: {
              message: 'Error getting status from Identity service',
            },
          }
        }
        return {
          status: serviceState.UP,
          detail: {
            version: res.version,
          },
        }
      }
      throw new Error()
    } catch (err) {
      return {
        status: serviceState.DOWN,
        detail: {
          message: 'Error getting status from Identity service',
        },
      }
    }
  }
}
// TODO : refactor into the class above. Ticket: https://digicatapult.atlassian.net/browse/L3-182
const getMemberByAlias = async (alias: string) => {
  const res = await fetch(`${URL_PREFIX}/v1/members/${encodeURIComponent(alias)}`)

  if (res.ok) {
    return await res.json()
  }

  if (res.status === 404) {
    throw new NotFound(`identity: ${alias}`)
  }

  throw new HttpResponse({})
}

const getHealth = async () => {
  const res = await fetch(`${URL_PREFIX}/health`)

  if (res.ok) {
    return await res.json()
  }

  throw new HttpResponse({})
}

const getMemberBySelf = async () => {
  const res = await fetch(`${URL_PREFIX}/v1/self`)

  if (res.ok) {
    return await res.json()
  }

  throw new HttpResponse({})
}

const getMemberByAddress = (alias: string) => getMemberByAlias(alias)

export { getMemberByAlias, getMemberByAddress, getMemberBySelf }
