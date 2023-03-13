import { Controller, Get, Route, Path, Response } from 'tsoa'
import { Logger } from 'pino'

import { logger } from '../../lib/logger'
import Database from '../../lib/db'
import { Demand, DemandSubtype, UUID } from '../../models/demands'
import { NotFoundError } from '../../lib/error-handler/index'
import { ValidateErrorJSON } from '../../lib/error-handler/index'

@Route('capacity')
export class CapacityController extends Controller {
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

  @Response<ValidateErrorJSON>(422, 'Validation Failed')
  @Get('{capacityId}')
  public async getCapacity(@Path() capacityId: UUID): Promise<{ status: number; capacity: Demand }> {
    const [capacity] = await this.db
      .demands()
      .select(['id', 'owner', 'status'])
      .where({ id: capacityId, subtype: DemandSubtype.Capacity })
    if (!capacity) throw new NotFoundError('Capacity Not Found')

    return {
      status: 200,
      capacity,
    }
  }
}
