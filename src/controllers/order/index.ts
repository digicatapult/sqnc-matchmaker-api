import { Get, Path, Body, Tags, Security, ValidateError, SuccessResponse, Response, Controller, Post, Route } from 'tsoa'
import { Logger } from 'pino'

import { UUID } from '../../models/uuid'
import { DemandRequest, DemandResponse, DemandState, DemandSubtype } from '../../models/demand'
import { TransactionResponse, TransactionState, TransactionApiType, TransactionType } from '../../models/transaction'
import { logger } from '../../lib/logger'
import { BadRequest, NotFound } from '../../lib/error-handler'
import Database from '../../lib/db'
import { getMemberByAddress, getMemberBySelf } from '../../lib/services/identity'
import { TokenType } from '../../models/tokenType'
import { runProcess } from '../..//lib/services/dscpApi'
import { observeTokenId } from '../../lib/services/blockchainWatcher'
import { demandCreate } from '../../lib/payload'

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
   * Returns the details of all order demands.
   * @summary List all order demands
   */
  @Get('/')
  public async getAll(): Promise<DemandResponse[]> {
    const capacities = await this.db.getDemands(DemandSubtype.order)
    const result = await Promise.all(capacities.map(async (order: DemandResponse) => ({
      ...order,
      alias: await getMemberByAddress(order.owner),
    })))
    return result
  }

  /**
   * @summary Get a order by ID
   * @param orderId The order's identifier
   */
  @Response<NotFound>(404, 'Item not found')
  @Get('{orderId}')
  public async getCapacity(@Path() orderId: UUID): Promise<DemandResponse> {
    const [order] = await this.db.getDemand(orderId)
    if (!order) throw new NotFound('capacity')

    return {
      ...order,
      alias: await getMemberByAddress(order.owner),
    }
  }

  /**
   * A member creates the capacity {capacityId} on-chain. The capacity is now viewable to other members.
   * @summary Create a new capacity demand on-chain
   * @param orderId The capacity's identifier
   */
  @Post('{orderId}/creation')
  @Response<NotFound>(404, 'Item not found')
  @SuccessResponse('201')
  public async createCapacityOnChain(@Path() orderId: UUID): Promise<TransactionResponse> {
    const [order] = await this.db.getDemand(orderId)
    if (!order) throw new NotFound('order')
    if (order.state !== DemandState.created) throw new BadRequest(`Demand must have state: ${DemandState.created}`)

    const [transaction] = await this.db.insertTransaction({
      api_type: TransactionApiType.order,
      transaction_type: TransactionType.creation,
      local_id: orderId,
      state: TransactionState.submitted,
    })

    const [tokenId] = await runProcess(demandCreate(order))
    await this.db.updateTransaction(transaction.id, { state: TransactionState.finalised })

    // demand-create returns a single token ID
    await observeTokenId(TokenType.DEMAND, orderId, DemandState.created, tokenId, true)
    return transaction
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
  public async create(@Body() { parametersAttachmentId }: DemandRequest): Promise<DemandResponse> {
    const [attachment] = await this.db.getAttachment(parametersAttachmentId)
    if (!attachment) throw new NotFound('attachment')

    const { address: selfAddress } = await getMemberBySelf()
    const [order] = await this.db.insertDemand({
      owner: selfAddress,
      subtype: DemandSubtype.order,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
    })

    return {
      id: order.id,
      owner: await getMemberByAddress(selfAddress).then(({ alias }: { alias: string }) => alias),
      state: order.state,
      parametersAttachmentId,
    }
  }
}
