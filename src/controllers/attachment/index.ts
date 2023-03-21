import {
  Security,
  Tags,
  UploadedFile,
  Request,
  Controller,
  Get,
  Route,
  Path,
  Post,
  Header,
  Response,
  SuccessResponse,
} from 'tsoa'
import { Logger } from 'pino'
import express from 'express'

import { logger } from '../../lib/logger'
import Database, { Models, Query } from '../../lib/db'
import type { Attachment } from '../../models'
import { BadRequest, NotFound } from '../../lib/error-handler'

type File = {
  [k: string]: string
}

@Route('attachment')
@Tags('attachment')
@Security('bearerAuth')
export class attachment extends Controller {
  log: Logger
  dbClient: Database = new Database()
  db: Models<Query> | any // TMP this is the only one could not address now

  constructor() {
    super()
    this.log = logger.child({ controller: '/attachment' })
    // TMP will be updated with a wrapper so ORM client independant
    this.db = this.dbClient.db()
  }

  @Get('/')
  @SuccessResponse(200, 'returns all attachments')
  public async get(): Promise<Attachment[]> {
    this.log.debug('retrieving all attachments')
    const result = await this.db.attachment()

    return result.map(({ binary_blob, ...item }: Attachment) => ({
      ...item,
      size: binary_blob.size,
    }))
  }

  @Post('/')
  @SuccessResponse(201, 'attachment has been created')
  public async create(@Request() req: express.Request, @UploadedFile() file: File): Promise<{ [k: string]: string }> {
    this.log.debug(`creating an attachment ${JSON.stringify(file || req.body)}`)

    if (file)
      return {
        attachment: await this.db.attachment('id').insert({
          filename: file.originalname,
          binary_blob: Buffer.from(file.buffer),
        }),
        message: 'binary attachment has been created',
      }

    if (!req.body) throw new BadRequest('nothing to upload')

    return {
      attachment: await this.db
        .attachment()
        .insert({
          filename: 'json',
          binary_blob: Buffer.from(JSON.stringify(req.body)),
        })
        .then((row: Array<unknown>) => row[0]), // row[0] - is first column in this case id
      message: 'JSON attachment has been created',
    }
  }

  @Get('/{id}')
  @Response<NotFound>(404)
  @Response<BadRequest>(400)
  @SuccessResponse(200)
  public async getById(
    @Request() req: express.Request,
    @Path() id: string,
    @Header('return-type') type: 'json' | 'file'
  ): Promise<Attachment> {
    this.log.debug(`attempting to retrieve ${id} attachment`)
    const { accept } = req.headers
    const [attachment] = await this.db.attachment().where({ id })
    if (!attachment) throw new NotFound('attachment')
    const { filename, binary_blob } = attachment

    if (type === 'json' || accept === 'application/json') {
      this.setHeader('content-type', 'application/json')
      return JSON.parse(binary_blob)
    }

    // default to octect-stream or allow error middleware to handle
    this.setHeader('accept', 'application/octet-stream')
    this.setHeader('access-control-expose-headers', 'content-disposition')
    this.setHeader('content-disposition', `attachment; filename="${filename}"`)
    this.setHeader('maxAge', `${365 * 24 * 60 * 60 * 1000}`)
    this.setHeader('immutable', 'true')

    return binary_blob
  }
}
