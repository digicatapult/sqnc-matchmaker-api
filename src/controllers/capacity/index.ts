import { Controller, Get, Route, Path, Response } from 'tsoa'
import { Logger } from 'pino'

import { logger } from '../../lib/logger'
import Database from '../../lib/db'
import { Demand, DemandSubtype, UUID } from '../../models/demands'
import { NotFoundError } from '../../lib/error-handler/index'
import { ValidateErrorJSON } from '../../lib/error-handler/index'
import { getMemberByAddress } from '../../services/identity'

@Route('capacity')
export class CapacityController extends Controller {
  log: Logger
  db: Database['db']

  constructor() {
    super()
    this.log = logger.child({ controller: '/capacity' })
    this.db = new Database().db()
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

    const { alias: ownerAlias } = await getMemberByAddress(capacity.owner)

    return {
      status: 200,
      capacity: { id: capacity.id, subtype: capacity.subtype, owner: ownerAlias, status: capacity.status },
    }
  }
}
