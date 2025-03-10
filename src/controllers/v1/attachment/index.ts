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
  Query,
} from 'tsoa'
import { Logger } from 'pino'
import express from 'express'
import { Readable } from 'node:stream'

import { logger } from '../../../lib/logger.js'
import Database from '../../../lib/db/index.js'
import type { Attachment } from '../../../models/attachment.js'
import { BadRequest, NotFound } from '../../../lib/error-handler/index.js'
import type { UUID, DATE } from '../../../models/strings.js'
import Ipfs from '../../../lib/ipfs.js'
import env from '../../../env.js'
import { parseDateParam } from '../../../lib/utils/queryParams.js'

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

@Route('v1/attachment')
@Tags('attachment')
@Security('oauth2')
export class attachment extends Controller {
  log: Logger
  db: Database = new Database()
  ipfs: Ipfs = new Ipfs({
    host: env.IPFS_HOST,
    port: env.IPFS_PORT,
    logger,
  })

  constructor() {
    super()
    this.log = logger.child({ controller: '/attachment' })
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
  public async get(@Query() updated_since?: DATE): Promise<Attachment[]> {
    const query: { updatedSince?: Date } = {}
    if (updated_since) {
      query.updatedSince = parseDateParam(updated_since)
    }

    this.log.debug('retrieving all attachment')

    const attachments = await this.db.getAttachments(query)
    return attachments.map(({ ipfsHash, ...rest }): Attachment => rest)
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

    const filename = file ? file.originalname : 'json'
    const fileBuffer = file?.buffer ? Buffer.from(file?.buffer) : Buffer.from(JSON.stringify(req.body))
    const fileBlob = new Blob([fileBuffer])
    const ipfsHash = await this.ipfs.addFile({ blob: fileBlob, filename })

    const [{ id, createdAt }] = await this.db.insertAttachment({
      filename,
      ipfs_hash: ipfsHash,
      size: fileBlob.size,
    })

    const result: Attachment = {
      id,
      filename,
      size: fileBlob.size,
      createdAt,
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
    const [attachment] = await this.db.getAttachment(id)
    if (!attachment) throw new NotFound('attachment')
    const { filename, ipfsHash, size } = attachment

    const { blob, filename: ipfsFilename } = await this.ipfs.getFile(ipfsHash)
    const blobBuffer = Buffer.from(await blob.arrayBuffer())

    if (size === null || filename === null) {
      try {
        await this.db.updateAttachment(id, ipfsFilename, blob.size)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown'
        this.log.warn('Error updating attachment size: %s', message)
      }
    }

    const orderedAccept = parseAccept(req.headers.accept || '*/*')
    if (filename === 'json') {
      for (const mimeType of orderedAccept) {
        if (mimeType === 'application/json' || mimeType === 'application/*' || mimeType === '*/*') {
          try {
            const json = JSON.parse(blobBuffer.toString())
            return json
          } catch (err) {
            this.log.warn('Unable to parse json file for attachment %s', id)
            this.log.debug('Parse error: %s', err instanceof Error ? err.message : 'unknown')
            return this.octetResponse(blobBuffer, filename)
          }
        }
        if (mimeType === 'application/octet-stream') {
          return this.octetResponse(blobBuffer, filename)
        }
      }
    }
    return this.octetResponse(blobBuffer, filename || ipfsFilename)
  }
}
