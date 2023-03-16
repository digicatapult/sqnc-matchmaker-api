import { Controller, Get, Post, Route, Path, Response, Body, SuccessResponse, Tags, Security } from 'tsoa'
import { Logger } from 'pino'

import { logger } from '../../lib/logger'
import Database from '../../lib/db'
import { DemandResponse, DemandSubtype, DemandRequest, DemandStatus } from '../../models/demand'
import { UUID } from '../../models/uuid'
import { NotFound } from '../../lib/error-handler/index'
import { ValidateErrorJSON, BadRequest } from '../../lib/error-handler/index'
import { getMemberByAddress, getMemberBySelf } from '../../lib/services/identity'

@Route('capacity')
@Tags('capacity')
@Security('bearerAuth')
export class CapacityController extends Controller {
  log: Logger
  db: Database

  constructor() {
    super()
    this.log = logger.child({ controller: '/capacity' })
    this.db = new Database()
  }

  /**
   * A Member creates a new demand for a capacity by referencing an uploaded parameters file.
   * @summary Create a new capacity demand
   */
  @Post()
  @Response<BadRequest>(400, 'Request was invalid')
  @SuccessResponse('201')
  public async createCapacity(@Body() requestBody: DemandRequest): Promise<DemandResponse> {
    const { parametersAttachmentId } = requestBody
    const [attachment] = await this.db.getAttachment(parametersAttachmentId)

    if (!attachment) {
      throw new BadRequest('Attachment id not found')
    }

    const selfAddress = await getMemberBySelf()

    const [capacity] = await this.db.insertDemand({
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

  /**
   * Returns the details of all capacity demands.
   * @summary List all capacity demands
   */
  @Get('/')
  public async getAll(): Promise<DemandResponse[]> {
    const capacities = await this.db.getDemands(DemandSubtype.Capacity)
    const result = await Promise.all(capacities.map(async (capacity: DemandResponse) => responseWithAlias(capacity)))
    return result
  }

  /**
   * @summary Get a capacity by ID
   * @param capacityId The capacity's identifier
   */
  @Response<ValidateErrorJSON>(422, 'Validation Failed')
  @Response<NotFound>(404, 'Item not found')
  @Get('{capacityId}')
  public async getCapacity(@Path() capacityId: UUID): Promise<DemandResponse> {
    const [capacity] = await this.db.getDemand(capacityId, DemandSubtype.Capacity)
    if (!capacity) throw new NotFound('Capacity Not Found')

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