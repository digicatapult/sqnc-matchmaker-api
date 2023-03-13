import { Controller, Get, Route } from 'tsoa'
import { Logger } from 'pino'

import { logger } from '../../lib/logger'
import Database from '../../lib/db'
import type { Demand } from '../../models'

@Route('capacity')
export class demand extends Controller {
  log: Logger
  // TMP update once we have more defined schema
  dbClient: any = new Database()
  db: any

  constructor() {
    super()
    this.log = logger.child({ controller: '/capacity' })
    this.db = this.dbClient.db()
  }

  @Get('/')
  public async get(): Promise<{ status: number; capacities: Demand[] }> {
    return {
      status: 200,
      capacities: await this.db.demands(),
    }
  }
}
