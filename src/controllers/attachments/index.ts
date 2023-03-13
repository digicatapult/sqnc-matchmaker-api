import { Controller, Get, Route } from 'tsoa'
import { Logger } from 'pino'

import { logger } from '../../lib/logger'
import Database from '../../lib/db'
import type { Attachments } from '../../models'

@Route('attachments')
export class attachments extends Controller {
  log: Logger
  // TMP update once we have more defined schema
  dbClient: any = new Database()
  db: any

  constructor() {
    super()
    this.log = logger.child({ controller: '/attachments' })
    this.db = this.dbClient.db()
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
