import { Controller, Get, Route } from 'tsoa'
import { Logger } from 'pino'

import { Request } from 'express'
import { logger } from '../../lib/logger'
import Database, { Models, Query } from '../../lib/db'
import type { Attachments } from '../../models'

@Route('attachments')
export class attachments extends Controller {
  log: Logger
  dbClient: Database = new Database() // TODO should init once when service starts
  db: Models<Query> | any // TODO

  constructor() {
    super()
    this.log = logger.child({ controller: '/attachments' })
    this.db = this.dbClient.init()
  }

  @Get('/{id}')
  public async getById(req: Request): Promise<{ status: number; attachment: Attachments }> {
    const { id } = req.params

    return {
      status: 200,
      attachment: await this.db.attachments().where(id),
    }
  }

  @Get('/')
  public async get(): Promise<{ status: number; attachments: Attachments[] }> {
    this.log.debug({
      msg: 'this is a test route to validate tsoa/swagger',
    })

    return {
      status: 200,
      attachments: await this.db.attachments(),
    }
  }
}
