import { Body, Tags, Security, ValidateError, SuccessResponse, Response, Controller, Post, Route } from 'tsoa'
import { Logger } from 'pino'

import { DemandRequest, DemandResponse } from '../../models'
import { logger } from '../../lib/logger'
import { BadRequest, NotFound } from '../../lib/error-handler'
import Database from '../../lib/db'
import { getMemberByAddress, getMemberBySelf } from '../../lib/services/identity'

const SUBTYPE = 'order'
const STATE = 'created'

@Route('demand')
@Tags('demand')
@Security('bearerAuth')
export class demand extends Controller {
  log: Logger
  db: Database
  constructor() {
    super()
    this.log = logger.child({ controller: '/demand' })
    this.db = new Database()
  }

  /**
   * A Member creates a new demand for a capacity by referencing an uploaded parameters file.
   * @summary Create a new order demand
   * @param parametersAttachmentId The attachment's identifier
  */
  @Post()
  @Response<BadRequest>(400, 'Request was invalid')
  @Response<NotFound>(404, 'Demand was not found')
  @Response<ValidateError>(422, 'Validation Failed')
  @SuccessResponse('201')
  public async createCapacity(@Body() { parametersAttachmentId }: DemandRequest): Promise<DemandResponse> {
    const [attachment] = await this.db.getAttachment(parametersAttachmentId)
    if (!attachment) throw new NotFound('attachment')

    const selfAddress = await getMemberBySelf()
    const [order] = await this.db.insertDemand({
      owner: selfAddress,
      subtype: SUBTYPE,
      state: STATE,
      parameters_attachment_id: parametersAttachmentId,
    })

    return {
      id: order.id,
      owner: await getMemberByAddress(selfAddress),
      state: order.state,
      parametersAttachmentId,
    }
  }
}
