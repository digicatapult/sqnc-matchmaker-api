import {
  ValidateError,
  Controller,
  Get,
  Post,
  Route,
  Path,
  Response,
  Body,
  SuccessResponse,
  Tags,
  Security,
} from 'tsoa'
import type { Logger } from 'pino'

import { logger } from '../../lib/logger'
import Database from '../../lib/db'
import { DemandResponse, DemandSubtype, DemandRequest, DemandState } from '../../models/demand'
import { UUID } from '../../models/uuid'
import { BadRequest, NotFound } from '../../lib/error-handler/index'
import { getMemberByAddress, getMemberBySelf } from '../../lib/services/identity'
import { TransactionResponse, TransactionState } from '../../models/transaction'
import { TokenType } from '../../models/tokenType'
import { runProcess } from '../..//lib/services/dscpApi'
import { demandCreate } from '../../lib/payload'
import { observeTokenId } from '../../lib/services/blockchainWatcher'
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
  @Response<ValidateError>(422, 'Validation Failed')
  @SuccessResponse('201')
  public async createCapacity(@Body() { parametersAttachmentId }: DemandRequest): Promise<DemandResponse> {
    const [attachment] = await this.db.getAttachment(parametersAttachmentId)

    if (!attachment) {
      throw new BadRequest('Attachment id not found')
    }

    const selfAddress = await getMemberBySelf()

    const [capacity] = await this.db.insertDemand({
      owner: selfAddress,
      subtype: DemandSubtype.capacity,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
    })

    const { alias: ownerAlias } = await getMemberByAddress(capacity.owner)
    return {
      id: capacity.id,
      owner: ownerAlias,
      state: capacity.state,
      parametersAttachmentId,
    }
  }

  /**
   * Returns the details of all capacity demands.
   * @summary List all capacity demands
   */
  @Get('/')
  public async getAll(): Promise<DemandResponse[]> {
    const capacities = await this.db.getDemands(DemandSubtype.capacity)
    const result = await Promise.all(capacities.map(async (capacity: DemandResponse) => responseWithAlias(capacity)))
    return result
  }

  /**
   * @summary Get a capacity by ID
   * @param capacityId The capacity's identifier
   */
  @Response<NotFound>(404, 'Item not found')
  @Get('{capacityId}')
  public async getCapacity(@Path() capacityId: UUID): Promise<DemandResponse> {
    const [capacity] = await this.db.getDemand(capacityId)
    if (!capacity) throw new NotFound('capacity')

    return responseWithAlias(capacity)
  }

  /**
   * A member creates the capacity {capacityId} on-chain. The capacity is now viewable to other members.
   * @summary Create a new capacity demand on-chain
   * @param capacityId The capacity's identifier
   */
  @Post('{capacityId}/creation')
  @Response<NotFound>(404, 'Item not found')
  @SuccessResponse('201')
  public async createCapacityOnChain(@Path() capacityId: UUID): Promise<TransactionResponse> {
    const [capacity] = await this.db.getDemandWithAttachment(capacityId, DemandSubtype.capacity)
    if (!capacity) throw new NotFound('capacity')

    const [transaction] = await this.db.insertTransaction({
      token_type: TokenType.DEMAND,
      local_id: capacityId,
      state: TransactionState.submitted,
    })

    // temp - until there is a blockchain watcher, need to await runProcess to know token IDs
    const [tokenId] = await runProcess(demandCreate(capacity))
    await this.db.updateTransaction(transaction.id, { state: TransactionState.finalised })

    // demand-create returns a single token ID
    await observeTokenId(TokenType.DEMAND, capacityId, tokenId, true)
    return {
      id: transaction.id,
      submittedAt: new Date(transaction.created_at),
      state: transaction.state,
    }
  }

  /**
   * @summary Get a capacity by ID
   * @param capacityId The capacity's identifier
   * @param creationId The capacity's creation ID
   */
  @Response<NotFound>(404, 'Items not found.')
  @SuccessResponse('200')
  @Get('{capacityId}/creation/{creationId}')
  public async getCreationID(@Path() capacityId: UUID, creationId: UUID): Promise<TransactionResponse> {
    const [capacity] = await this.db.getDemand(capacityId)
    if (!capacity) throw new NotFound('capacity')

    const [creation] = await this.db.getTransaction(creationId)
    if (!creation) throw new NotFound('creation')
    return creation
  }

  @Response<NotFound>(404, 'Items not found.')
  @SuccessResponse('200')
  @Get('{capacityId}/creation/')
  public async getTransactionsFromCapacity(@Path() capacityId: UUID): Promise<TransactionResponse[]> {
    const [capacity] = await this.db.getDemand(capacityId)
    if (!capacity) throw new NotFound('capacity')

    const creations = await this.db.getTransactionsFromCapacityID(capacityId)
    return creations
  }
}

const responseWithAlias = async (capacity: DemandResponse): Promise<DemandResponse> => {
  const { alias: ownerAlias } = await getMemberByAddress(capacity.owner)

  return {
    id: capacity.id,
    owner: ownerAlias,
    state: capacity.state,
    parametersAttachmentId: capacity.parametersAttachmentId,
  }
}
