import { UploadedFile, Request, Controller, Get, Route, Path, Post, Response } from 'tsoa'
import { Logger } from 'pino'
import express from 'express'

import { logger } from '../../lib/logger'
import Database, { Models, Query } from '../../lib/db'
import type { Attachments } from '../../models'
import { BadRequst } from '../../lib/error-handler'

/**
 * This is Response description, will it work? - this is a test
 */
interface Success {
  status: 200 | 201 | 404
  message?: string
  data?: Attachments[] | Attachments
}

type ResponseHeaders = 'application/json' | 'application/octet-stream'

interface BadRequstResponse {
  status: 400,
  message?: string, 
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
    this.db = this.dbClient.init()
  }

  @Get('/')
  public async get(): Promise<Success> {
    this.log.info('retrieving all attachments')
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
  public async create(
    @Request() req: express.Request,
    @UploadedFile() file: File,
  ): Promise<Success> {
    this.log.info({ message: 'crating an attachment', attachment: file || req.body })
    if (file)
      return {
        status: 201,
        data: await this.db.attachments().insert({
          filename: file.originalname,
          binary_blob: Buffer.from(file.buffer),
        }),
      }

    if (!req.body) throw new Error('nothing to upload') // TODO return correct (badreq)

    return {
      status: 201,
      data: await this.db.attachments().insert({
        filename: 'json',
        binary_blob: Buffer.from(JSON.stringify(req.body)),
      }),
    }
  }

  @Get('/{id}')
  @Response<BadRequstResponse, { accept: ResponseHeaders }>(400)
  public async getById(
    @Path() id: string,
    @Request() req: express.Request,
  ): Promise<Success> {
    const [attachment] = await this.db.attachments().where({ id })
    if (!attachment) throw new Error('not found') // TODO update after most routes have been defined (all in one)
    const { accept } = req.headers

    // we do not care if json or not since request is for download
    if (accept === 'application/octet-stream') return {
      status: 200,
      data: attachment, 
    }

    // no need to check for filename since JSON.parse will throw
    if (accept === 'application/json') return {
      status: 200,
      data: JSON.parse(attachment.binary_blob),
    }

    throw new BadRequst()
  }
}
