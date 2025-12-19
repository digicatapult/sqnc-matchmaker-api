import { container, singleton } from 'tsyringe'
import { z } from 'zod'

import { HttpResponse } from '../error-handler/index.js'
import env from '../../env.js'
import type { Status } from '../service-watcher/statusPoll.js'
import { serviceState } from '../service-watcher/statusPoll.js'
import { logger } from '../logger.js'
import AuthInternal from './authInternal.js'

const attachmentHealthValidator = z.object({
  version: z.string(),
  status: z.union([z.literal(serviceState.UP), z.literal(serviceState.DOWN), z.literal(serviceState.ERROR)]),
})
type IdentityHealthResponse = z.infer<typeof attachmentHealthValidator>

const attachmentParser = z.object({
  id: z.string(),
  integrityHash: z.string(),
  filename: z.union([z.string(), z.null()]),
  size: z.union([z.number(), z.null()]),
  createdAt: z.string(),
})
const attachmentsParser = z.array(attachmentParser)

export type AttachmentEntry = z.infer<typeof attachmentParser>

@singleton()
export default class Attachment {
  private URL_PREFIX: string

  constructor(private authInternal: AuthInternal) {
    this.URL_PREFIX = `http://${env.ATTACHMENT_SERVICE_HOST}:${env.ATTACHMENT_SERVICE_PORT}`
  }

  static getStatus = async (): Promise<Status> => {
    const instance = container.resolve(Attachment)
    try {
      const res = await instance.getHealth()
      if (res) {
        if (!res.version.match(/\d+.\d+.\d+/)) {
          return {
            status: serviceState.DOWN,
            detail: {
              message: 'Error getting status from Attachment service',
            },
          }
        }
        return {
          status: res.status,
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
          message: 'Error getting status from Attachment service',
        },
      }
    }
  }

  getAttachments = async (ids?: string[], authorization?: string): Promise<AttachmentEntry[]> => {
    const search = new URLSearchParams()
    for (const id of ids ?? []) {
      search.append('id', id)
    }

    const res = await fetch(`${this.URL_PREFIX}/v1/attachment?${search}`, {
      headers: {
        authorization: authorization || `bearer ${await this.authInternal.getInternalAccessToken()}`,
      },
    })

    if (res.ok) {
      return attachmentsParser.parse(await res.json())
    }

    throw new HttpResponse({})
  }

  insertAttachment = async (integrityHash: string, ownerAddress: string): Promise<AttachmentEntry> => {
    const res = await fetch(`${this.URL_PREFIX}/v1/attachment`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${await this.authInternal.getInternalAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        integrityHash,
        ownerAddress,
      }),
    })

    if (res.ok) {
      return attachmentParser.parse(await res.json())
    }

    throw new HttpResponse({})
  }

  deleteAttachment = async (id: string): Promise<void> => {
    const res = await fetch(`${this.URL_PREFIX}/v1/attachment/${id}`, {
      method: 'DELETE',
      headers: {
        authorization: `bearer ${await this.authInternal.getInternalAccessToken()}`,
      },
    })

    if (res.ok) {
      return
    }

    throw new HttpResponse({})
  }

  getHealth = async (): Promise<IdentityHealthResponse> => {
    const res = await fetch(`${this.URL_PREFIX}/health`)

    if (res.ok || res.status === 503) {
      return attachmentHealthValidator.parse(await res.json())
    }

    throw new HttpResponse({})
  }
}
