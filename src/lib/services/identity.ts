import { container, singleton } from 'tsyringe'
import { z } from 'zod'

import { NotFound, HttpResponse } from '../error-handler/index.js'
import env from '../../env.js'
import type { Status } from '../service-watcher/statusPoll.js'
import { serviceState } from '../service-watcher/statusPoll.js'
import { logger } from '../logger.js'
import type AuthInternal from './authInternal.js'

const identityResponseValidator = z.object({
  address: z.string(),
  alias: z.string(),
  role: z.union([z.undefined(), z.literal('Optimiser'), z.literal('Self')]).optional(),
})
export type IdentityResponse = z.infer<typeof identityResponseValidator>

const identityHealthValidator = z.object({
  version: z.string(),
  status: z.literal('ok'),
})
type IdentityHealthResponse = z.infer<typeof identityHealthValidator>

@singleton()
export default class Identity {
  private URL_PREFIX: string

  constructor(private authInternal: AuthInternal) {
    this.URL_PREFIX = `http://${env.IDENTITY_SERVICE_HOST}:${env.IDENTITY_SERVICE_PORT}`
  }

  static getStatus = async (): Promise<Status> => {
    const instance = container.resolve(Identity)
    try {
      const res = await instance.getHealth()
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
      logger.debug('Identity service status error: %s', err instanceof Error ? err.message : 'unknown')
      return {
        status: serviceState.DOWN,
        detail: {
          message: 'Error getting status from Identity service',
        },
      }
    }
  }
  getMemberByAlias = async (alias: string): Promise<IdentityResponse> => {
    const res = await fetch(`${this.URL_PREFIX}/v1/members/${encodeURIComponent(alias)}`, {
      headers: {
        authorization: `bearer ${await this.authInternal.getInternalAccessToken()}`,
      },
    })

    if (res.ok) {
      return identityResponseValidator.parse(await res.json())
    }

    if (res.status === 404) {
      throw new NotFound(`identity: ${alias}`)
    }

    throw new HttpResponse({})
  }

  getHealth = async (): Promise<IdentityHealthResponse> => {
    const res = await fetch(`${this.URL_PREFIX}/health`)

    if (res.ok) {
      return identityHealthValidator.parse(await res.json())
    }

    throw new HttpResponse({})
  }

  getMemberBySelf = async (): Promise<IdentityResponse> => {
    const res = await fetch(`${this.URL_PREFIX}/v1/self`, {
      headers: {
        authorization: `bearer ${await this.authInternal.getInternalAccessToken()}`,
      },
    })

    if (res.ok) {
      return identityResponseValidator.parse(await res.json())
    }

    throw new HttpResponse({})
  }

  getMemberByAddress = (alias: string) => this.getMemberByAlias(alias)

  async updateRole(role: string, authorization: string): Promise<void> {
    const res = await fetch(`${this.URL_PREFIX}/v1/roles/${role}`, {
      method: 'PUT',
      headers: {
        authorization,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      throw new HttpResponse({
        message: 'Failed to update role',
      })
    }
  }

  async getAllRoles(authorization: string): Promise<string[]> {
    const res = await fetch(`${this.URL_PREFIX}/v1/roles`, {
      headers: {
        authorization,
      },
    })

    if (res.ok) {
      const roles = await res.json()
      return roles
    }

    throw new HttpResponse({
      message: 'Failed to fetch roles',
    })
  }
}
