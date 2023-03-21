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
import { Readable } from 'node:stream'

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

  octetResponse(blob: Blob, name: string): Blob {
    // default to octect-stream or allow error middleware to handle
    this.setHeader('accept', 'application/octet-stream')
    this.setHeader('access-control-expose-headers', 'content-disposition')
    this.setHeader('content-disposition', `attachment; filename="${name}"`)
    this.setHeader('maxAge', `${365 * 24 * 60 * 60 * 1000}`)
    this.setHeader('immutable', 'true')

    return blob
  }

  @Get('/')
  @SuccessResponse(200, 'returns all attachment')
  public async get(): Promise<Attachment[]> {
    this.log.debug('retrieving all attachment')
    const result = await this.db.attachment()

    return result.map(({ id, filename, binary_blob, created_at }: any): Attachment => {
      const size = (binary_blob as Buffer).length
      return {
        id,
        filename,
        createdAt: created_at,
        size,
      }
    })
  }

  @Post('/')
  @SuccessResponse(201, 'attachment has been created')
  public async create(@Request() req: express.Request, @UploadedFile() file: Express.Multer.File): Promise<Attachment> {
    this.log.debug(`creating an attachment ${JSON.stringify(file || req.body)}`)

    if (!req.body && !file) throw new BadRequest('nothing to upload')

    const [{ id, filename, binary_blob, created_at }]: any[] = await this.db
      .attachment()
      .insert({
        filename: file ? file.originalname : 'json',
        binary_blob: Buffer.from(file.buffer || JSON.stringify(req.body)),
      })
      .returning(['id', 'filename', 'binary_blob', 'created_at'])

    const result: Attachment = {
      id,
      filename,
      createdAt: created_at,
      size: (binary_blob as Buffer).length,
    }
    return result
  }

  @Get('/{id}')
  @Response<NotFound>(404)
  @Response<BadRequest>(400)
  @SuccessResponse(200)
  public async getById(
    @Request() req: express.Request,
    @Path() id: string,
    @Header('return-type') type: 'json' | 'file'
  ): Promise<unknown | Readable> {
    this.log.debug(`attempting to retrieve ${id} attachment`)
    const { accept } = req.headers
    const [attachment] = await this.db.attachment().where({ id })
    if (!attachment) throw new NotFound('attachment')
    const { filename, binary_blob } = attachment

    // log and default to octect-stream
    if (type === 'json' || accept === 'application/json') {
      this.setHeader('content-type', 'application/json')
      try {
        return JSON.parse(binary_blob)
      } catch (err) {
        this.log.warn('requested type failed, returning as octet')
      }
    }

    return this.octetResponse(binary_blob, filename)
  }
}
