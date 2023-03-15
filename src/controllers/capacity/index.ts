import { Controller, Get, Post, Route, Path, Response, Body, SuccessResponse } from 'tsoa'
import { Logger } from 'pino'

import { logger } from '../../lib/logger'
import Database from '../../lib/db'
import { DemandResponse, DemandSubtype, UUID, DemandRequest, DemandStatus } from '../../models/demands'
import { NotFoundError } from '../../lib/error-handler/index'
import { ValidateErrorJSON, BadRequestError } from '../../lib/error-handler/index'
import { getMemberByAddress, getMemberBySelf } from '../../services/identity'

@Route('capacity')
export class CapacityController extends Controller {
  log: Logger
  db: Database

  constructor() {
    super()
    this.log = logger.child({ controller: '/capacity' })
    this.db = new Database()
  }

  @Post()
  @SuccessResponse('201', 'Created')
  public async createCapacity(@Body() requestBody: DemandRequest): Promise<DemandResponse> {
    const { parametersAttachmentId } = requestBody
    const [attachment] = await this.db.getAttachment(parametersAttachmentId)

    if (!attachment) {
      throw new BadRequestError('Attachment id not found')
    }

    const selfAddress = await getMemberBySelf()

    const [capacity] = await this.db.insertCapacity({
      owner: selfAddress,
      subtype: DemandSubtype.Capacity,
      status: DemandStatus.Created,
      parameters_attachment_id: parametersAttachmentId,
    })

    const { alias: ownerAlias } = await getMemberByAddress(capacity.owner)
    return {
      id: capacity.id,
      owner: ownerAlias,
      status: capacity.status,
      parametersAttachmentId: parametersAttachmentId,
    }
  }

  @Get('/')
  public async getAll(): Promise<DemandResponse[]> {
    const capacities = await this.db.getCapacities()
    const result = await Promise.all(capacities.map(async (capacity: DemandResponse) => responseWithAlias(capacity)))
    return result
  }

  @Response<ValidateErrorJSON>(422, 'Validation Failed')
  @Get('{capacityId}')
  public async getCapacity(@Path() capacityId: UUID): Promise<DemandResponse> {
    const [capacity] = await this.db.getCapacity(capacityId)
    if (!capacity) throw new NotFoundError('Capacity Not Found')

    return responseWithAlias(capacity)
  }
}

const responseWithAlias = async (capacity: DemandResponse): Promise<DemandResponse> => {
  const { alias: ownerAlias } = await getMemberByAddress(capacity.owner)

  return {
    id: capacity.id,
    owner: ownerAlias,
    status: capacity.status,
    parametersAttachmentId: capacity.parametersAttachmentId,
  }
}
