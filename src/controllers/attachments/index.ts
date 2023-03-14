import { Controller, Get, Route, Path, Post, Body, Header, UploadedFile } from 'tsoa'
import { Logger } from 'pino'
import fs from 'fs'

import { logger } from '../../lib/logger'
import Database, { Models, Query } from '../../lib/db'
import type { Attachments } from '../../models'

type Response = {
  status: 200 | 201 | 404
  msg?: string
  data?: Attachments[] | Attachments
} | void

type Headers = {
  [key: string]: string
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
  public async get(): Promise<Response> {
    this.log.info('retrieving all attachments')

    return {
      status: 200,
      data: await this.db.attachments().map(({ binary_blob, ...item }: Attachments) => ({
        ...item,
        size: binary_blob.size,
      })),
    }
  }

  @Post('/')
  public async create(
    @Body() body: Attachments,
    @Header() header: Headers,
    @UploadedFile() file: { [k: string]: string } // TODO tried using some blob types did not work, need to research
  ): Promise<Response> {
    if (header['content-type'] === 'application/json') {
      this.log.info('JSON attachment upload: %j', body)

      return {
        status: 201,
        data: await this.db.attachments().insert({
          filename: 'json',
          binary_blob: Buffer.from(JSON.stringify(body)),
        }),
      }
    }

    if (!file) throw new Error('no file uploaded')
    this.log.info('file attachment upload: %s', file)

    fs.readFile(file.path, async (err, data) => {
      if (err) throw new Error(err.message)

      return {
        status: 201,
        data: await this.db.attacments().insert({
          filename: file.originalname,
          binary_blob: data,
        }),
      }
    })
  }

  @Get('/{id}')
  public async getById(@Path() id: string): Promise<Response> {
    // TMP will be updated to return depending on headers
    return {
      status: 200,
      data: await this.db.attachments().where(id),
    }
  }
}
