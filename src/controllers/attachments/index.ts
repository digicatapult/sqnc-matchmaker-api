import { UploadedFile, Request, Controller, Get, Route, Path, Post, Header, Response } from 'tsoa'
import { Logger } from 'pino'
import express from 'express'

import { logger } from '../../lib/logger'
import Database, { Models, Query } from '../../lib/db'
import type { Attachments } from '../../models'
import { BadRequst, NotFound } from '../../lib/error-handler'

/**
 * A successfull reponse
 * @example { "status": 200, "data": [ { "id": "5a3f54bd-a459-45fb-8e50-9ffdd26ff981", "filename": "Screenshot 2023-03-13 at 15.26.41.png", "created_at": "2023-03-14T11:56:19.832Z" } ] }
 */
interface Success {
  status: 200 | 201
  message?: string
  data?: Attachments[] | Attachments
  headers?: { [k: string]: unknown }
}

type File = {
  [k: string]: string
}

@Route('attachments')
export class attachments extends Controller {
  log: Logger
  dbClient: Database = new Database()
  db: Models<Query> | any // TMP this is the only one could not address now

  constructor() {
    super()
    this.log = logger.child({ controller: '/attachments' })
    // TMP will be updated with a wrapper so ORM client independant
    this.db = this.dbClient.init()
  }

  @Get('/')
  public async get(): Promise<Success> {
    this.log.debug('retrieving all attachments')
    const result = await this.db.attachments()

    return {
      status: 200,
      data: result.map(({ binary_blob, ...item }: Attachments) => ({
        ...item,
        size: binary_blob.size,
      })),
    }
  }

  @Post('/')
  public async create(@Request() req: express.Request, @UploadedFile() file: File): Promise<Success> {
    this.log.debug(`crating an attachment ${JSON.stringify(file || req.body)}`)
    if (file) {
      await this.db.attachments().insert({
        filename: file.originalname,
        binary_blob: Buffer.from(file.buffer),
      })
      return {
        status: 201,
        message: 'created as file blob',
      }
    }

    if (!req.body) throw new Error('nothing to upload') // TODO return correct (badreq)

    await this.db.attachments().insert({
      filename: 'json',
      binary_blob: Buffer.from(JSON.stringify(req.body)),
    })

    return {
      status: 201,
      message: 'created as JSON',
    }
  }

  @Get('/{id}')
  @Response<NotFound>(404)
  @Response<BadRequst>(400)
  public async getById(
    @Request() req: express.Request,
    @Path() id: string,
    @Header('return-type') type: 'json' | 'file'
  ): Promise<Success> {
    this.log.debug(`attempting to retrieve ${id} attachment`)
    const { accept } = req.headers
    const [attachment] = await this.db.attachments().where({ id })
    if (!attachment) throw new NotFound('attachments')

    // we do not care if json or not since request is for download
    if (type === 'file' || accept === 'application/octet-stream') {
      this.setHeader('accept', 'application/octet-stream')
      return {
        status: 200,
        headers: {
          immutable: true,
          maxAge: 365 * 24 * 60 * 60 * 1000,
          'content-disposition': `attachment; filename="${attachment.filename}"`,
          'access-control-expose-headers': 'content-disposition',
          'content-type': 'application/octet-stream',
        },
        data: attachment,
      }
    }

    // no need to check for filename since JSON.parse will throw
    if (type === 'json' || accept === 'application/json') {
      this.setHeader('content-type', 'application/json')
      return {
        status: 200,
        data: JSON.parse(attachment.binary_blob),
      }
    }

    throw new BadRequst()
  }
}
