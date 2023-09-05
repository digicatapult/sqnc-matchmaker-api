import { NotFound, HttpResponse } from '../error-handler'
import env from '../../env'
export const serviceState = {
  UP: 'up',
  DOWN: 'down',
  ERROR: 'error',
} as const
type serviceStateType = typeof serviceState
export type SERVICE_STATE = serviceStateType['UP' | 'DOWN' | 'ERROR']
export type Status = {
  status: SERVICE_STATE
  detail: Record<string, unknown> | null
}

const URL_PREFIX = `http://${env.IDENTITY_SERVICE_HOST}:${env.IDENTITY_SERVICE_PORT}/v1`

export default class IdentityClass {
  constructor() {}

  getStatus = async (): Promise<Status> => {
    try {
      const res = await getMemberBySelf()
      console.log(res)
      if (res) {
        if (res.address.length < 1) {
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
            version: 'some version',
          },
        }
      }
      return {
        status: serviceState.DOWN,
        detail: {
          message: 'Error getting status from Identity service',
        },
      }
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

const getMemberByAlias = async (alias: string) => {
  const res = await fetch(`${URL_PREFIX}/members/${encodeURIComponent(alias)}`)

  if (res.ok) {
    return await res.json()
  }

  if (res.status === 404) {
    throw new NotFound(`identity: ${alias}`)
  }

  throw new HttpResponse({})
}

const getMemberBySelf = async () => {
  const res = await fetch(`${URL_PREFIX}/self`)

  if (res.ok) {
    return await res.json()
  }

  throw new HttpResponse({})
}

const getMemberByAddress = (alias: string) => getMemberByAlias(alias)

export { getMemberByAlias, getMemberByAddress, getMemberBySelf }
