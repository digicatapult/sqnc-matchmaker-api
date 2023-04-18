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
  Response,
  SuccessResponse,
  Produces,
  ValidateError,
} from 'tsoa'
import { Logger } from 'pino'
import express from 'express'

import { logger } from '../../lib/logger'
import Database, { Models, Query } from '../../lib/db'
import type { Attachment } from '../../models'
import { BadRequest, NotFound } from '../../lib/error-handler'
import { Readable } from 'node:stream'
import type { UUID } from '../../models/uuid'

const parseAccept = (acceptHeader: string) =>
  acceptHeader
    .split(',')
    .map((acceptElement) => {
      const trimmed = acceptElement.trim()
      const [mimeType, quality = '1'] = trimmed.split(';q=')
      return { mimeType, quality: parseFloat(quality) }
    })
    .sort((a, b) => {
      if (a.quality !== b.quality) {
        return b.quality - a.quality
      }
      const [aType, aSubtype] = a.mimeType.split('/')
      const [bType, bSubtype] = b.mimeType.split('/')
      if (aType === '*' && bType !== '*') {
        return 1
      }
      if (aType !== '*' && bType === '*') {
        return -1
      }
      if (aSubtype === '*' && bSubtype !== '*') {
        return 1
      }
      if (aSubtype !== '*' && bSubtype === '*') {
        return -1
      }
      return 0
    })
    .map(({ mimeType }) => mimeType)

@Route('attachment')
@Tags('attachment')
@Security('bearerAuth')
export class attachment extends Controller {
  log: Logger
  dbClient: Database = new Database()
  db: Models<() => Query> // TMP this is the only one could not address now

  constructor() {
    super()
    this.log = logger.child({ controller: '/attachment' })
    // TMP will be updated with a wrapper so ORM client independent
    this.db = this.dbClient.db()
  }

  octetResponse(buffer: Buffer, name: string): Readable {
    // default to octet-stream or allow error middleware to handle
    this.setHeader('access-control-expose-headers', 'content-disposition')
    this.setHeader('content-disposition', `attachment; filename="${name}"`)
    this.setHeader('content-type', 'application/octet-stream')
    this.setHeader('maxAge', `${365 * 24 * 60 * 60 * 1000}`)
    this.setHeader('immutable', 'true')

    return Readable.from(buffer)
  }

  @Get('/')
  @SuccessResponse(200, 'returns all attachment')
  public async get(): Promise<Attachment[]> {
    this.log.debug('retrieving all attachment')

    const attachments: Attachment[] = await this.db.attachment()
    return attachments.map(
      ({ binary_blob, created_at, ...rest }: any): Attachment => ({
        ...rest,
        createdAt: created_at,
        size: binary_blob.length,
      })
    )
  }

  @Post('/')
  @SuccessResponse(201, 'attachment has been created')
  @Response<ValidateError>(422, 'Validation Failed')
  public async create(
    @Request() req: express.Request,
    @UploadedFile() file?: Express.Multer.File
  ): Promise<Attachment> {
    this.log.debug(`creating an attachment filename: ${file?.originalname || 'json'}`)

    if (!req.body && !file) throw new BadRequest('nothing to upload')

    const [{ id, filename, binary_blob, created_at }] = await this.db
      .attachment()
      .insert({
        filename: file ? file.originalname : 'json',
        binary_blob: Buffer.from(file?.buffer || JSON.stringify(req.body)),
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
  @Produces('application/json')
  @Produces('application/octet-stream')
  @SuccessResponse(200)
  public async getById(@Request() req: express.Request, @Path() id: UUID): Promise<unknown | Readable> {
    this.log.debug(`attempting to retrieve ${id} attachment`)
    const [attachment] = await this.db.attachment().where({ id })
    if (!attachment) throw new NotFound('attachment')
    const { filename, binary_blob }: { filename: string; binary_blob: Buffer } = attachment

    const orderedAccept = parseAccept(req.headers.accept || '*/*')
    if (filename === 'json') {
      for (const mimeType of orderedAccept) {
        if (mimeType === 'application/json' || mimeType === 'application/*' || mimeType === '*/*') {
          try {
            const json = JSON.parse(binary_blob.toString())
            return json
          } catch (err) {
            this.log.warn(`Unable to parse json file for attachment ${id}`)
            return this.octetResponse(binary_blob, filename)
          }
        }
        if (mimeType === 'application/octet-stream') {
          return this.octetResponse(binary_blob, filename)
        }
      }
    }
    return this.octetResponse(binary_blob, filename)
  }
}
