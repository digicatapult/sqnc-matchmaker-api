import { Body, Tags, Security, ValidateError, SuccessResponse, Response, Controller, Post, Route } from 'tsoa'
import { Logger } from 'pino'

import { DemandRequest, DemandResponse } from '../../models'
import { logger } from '../../lib/logger'
import { BadRequest, NotFound } from '../../lib/error-handler'
import Database from '../../lib/db'
import { getMemberByAddress, getMemberBySelf } from '../../lib/services/identity'

const SUBTYPE = 'order'
const STATE = 'created'

@Route('order')
@Tags('order')
@Security('bearerAuth')
export class order extends Controller {
  log: Logger
  db: Database
  constructor() {
    super()
    this.log = logger.child({ controller: '/order' })
    this.db = new Database()
  }

  /**
   * A Member creates a new demand for a order by referencing an uploaded parameters file.
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

    console.log({ order })
    return {
      id: order.id,
      owner: await getMemberByAddress(selfAddress).then(({ alias }: { alias: string}) => alias),
      state: order.state,
      parametersAttachmentId,
    }
  }
}
