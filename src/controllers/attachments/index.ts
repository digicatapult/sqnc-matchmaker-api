import { UploadedFile, Request, Controller, Get, Route, Path, Post, Header, Response, SuccessResponse } from 'tsoa'
import { Logger } from 'pino'
import express from 'express'

import { logger } from '../../lib/logger'
import Database, { Models, Query } from '../../lib/db'
import type { Attachments } from '../../models'
import { BadReqeust, NotFound } from '../../lib/error-handler'

type File = {
  [k: string]: string
}

@Route('attachment')
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
  @SuccessResponse(201, 'returns all attachments')
  public async get(): Promise<Attachments[]> {
    this.log.debug('retrieving all attachments')
    const result = await this.db.attachments()

    return result.map(({ binary_blob, ...item }: Attachments) => ({
      ...item,
      size: binary_blob.size,
    }))
  }

  @Post('/')
  @SuccessResponse(201, 'attachemnt has been created')
  public async create(@Request() req: express.Request, @UploadedFile() file: File): Promise<string> {
    this.log.debug(`crating an attachment ${JSON.stringify(file || req.body)}`)
    if (file) {
      await this.db.attachments().insert({
        filename: file.originalname,
        binary_blob: Buffer.from(file.buffer),
      })
    }

    if (!req.body) throw new Error('nothing to upload') // TODO return correct (badreq)

    await this.db.attachments().insert({
      filename: 'json',
      binary_blob: Buffer.from(JSON.stringify(req.body)),
    })

    return 'success'
  }

  @Get('/{id}')
  @Response<NotFound>(404)
  @Response<BadReqeust>(400)
  @SuccessResponse(200)
  public async getById(
    @Request() req: express.Request,
    @Path() id: string,
    @Header('return-type') type: 'json' | 'file'
  ): Promise<Attachments> {
    this.log.debug(`attempting to retrieve ${id} attachment`)
    const { accept } = req.headers
    const [attachment] = await this.db.attachments().where({ id })
    if (!attachment) throw new NotFound('attachments')

    // TMP doubling upping on headers as I was not able to figure out why 'accept' using @Header() get overwritten
    // also not checking for mime type as we have two options here download or sned json
    if (type === 'file' || accept === 'application/octet-stream') {
      this.setHeader('accept', 'application/octet-stream')
      this.setHeader('access-control-expose-headers', 'content-disposition')
      this.setHeader('content-disposition', `attachment; filename="${attachment.filename}"`)
      this.setHeader('maxAge', `${365 * 24 * 60 * 60 * 1000}`)
      this.setHeader('immutable', 'true')

      return attachment
    }

    // no need to check for filename since JSON.parse will throw
    if (type === 'json' || accept === 'application/json') {
      this.setHeader('content-type', 'application/json')
      return JSON.parse(attachment.binary_blob)
    }

    throw new BadReqeust()
  }
}
