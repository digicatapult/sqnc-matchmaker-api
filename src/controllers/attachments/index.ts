import { Controller, Get, Route, Path, Post, Body } from 'tsoa'
import { Logger } from 'pino'

import { logger } from '../../lib/logger'
import Database, { Models, Query } from '../../lib/db'
import type { Attachments } from '../../models'

type Response = {
  status: 200 | 201 | 404,
  msg?: string
  data: Attachments[] | Attachments
} | void

@Route('attachments')
export class attachments extends Controller {
  log: Logger
  dbClient: Database = new Database()
  db: Models<Query> | any // TODO

  constructor() {
    super()
    this.log = logger.child({ controller: '/attachments' })
    this.db = this.dbClient.init()
  }

  @Get('/')
  public async get(): Promise<Response> {
    this.log.debug({
      msg: 'this is a test route to validate tsoa/swagger',
    })

    return {
      status: 200,
      data: await this.db.attachments(),
    }
  }

  @Post('/')
  public async create(@Body() data: Attachments): Promise<Response> {
    console.log(data)

    return Promise.resolve()
  }

  @Get('/{id}')
  public async getById(@Path() id: string): Promise<Response> {
    return {
      status: 200,
      data: await this.db.attachments().where(id),
    }
  }
}
