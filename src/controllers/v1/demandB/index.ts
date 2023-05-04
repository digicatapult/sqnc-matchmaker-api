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

import { logger } from '../../../lib/logger'
import Database from '../../../lib/db'
import { DemandResponse, DemandRequest } from '../../../models/demand'
import { UUID } from '../../../models/strings'
import { BadRequest, NotFound } from '../../../lib/error-handler/index'
import { getMemberByAddress, getMemberBySelf } from '../../../lib/services/identity'
import { TransactionResponse } from '../../../models/transaction'
import { demandCreate } from '../../../lib/payload'
import ChainNode from '../../../lib/chainNode'
import env from '../../../env'

@Route('v1/demandB')
@Tags('demandB')
@Security('BearerAuth')
export class DemandBController extends Controller {
  log: Logger
  db: Database
  node: ChainNode

  constructor() {
    super()
    this.log = logger.child({ controller: '/demandB' })
    this.db = new Database()
    this.node = new ChainNode({
      host: env.NODE_HOST,
      port: env.NODE_PORT,
      logger,
      userUri: env.USER_URI,
    })
  }

  /**
   * A Member creates a new demand for a demandB by referencing an uploaded parameters file.
   * @summary Create a new demandB demand
   */
  @Post()
  @Response<BadRequest>(400, 'Request was invalid')
  @Response<ValidateError>(422, 'Validation Failed')
  @SuccessResponse('201')
  public async createDemandB(@Body() { parametersAttachmentId }: DemandRequest): Promise<DemandResponse> {
    const [attachment] = await this.db.getAttachment(parametersAttachmentId)

    if (!attachment) {
      throw new BadRequest('Attachment id not found')
    }

    const { address: selfAddress, alias: selfAlias } = await getMemberBySelf()

    const [demandB] = await this.db.insertDemand({
      owner: selfAddress,
      subtype: 'demand_b',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
    })

    return {
      id: demandB.id,
      owner: selfAlias,
      state: demandB.state,
      parametersAttachmentId,
    }
  }

  /**
   * Returns the details of all demandB demands.
   * @summary List all demandB demands
   */
  @Get('/')
  public async getAll(): Promise<DemandResponse[]> {
    const capacities = await this.db.getDemands('demand_b')
    const result = await Promise.all(capacities.map(async (demandB: DemandResponse) => responseWithAlias(demandB)))
    return result
  }

  /**
   * @summary Get a demandB by ID
   * @param demandBId The demandB's identifier
   */
  @Response<NotFound>(404, 'Item not found')
  @Get('{demandBId}')
  public async getDemandB(@Path() demandBId: UUID): Promise<DemandResponse> {
    const [demandB] = await this.db.getDemand(demandBId)
    if (!demandB) throw new NotFound('demandB')

    return responseWithAlias(demandB)
  }

  /**
   * A member creates the demandB {demandBId} on-chain. The demandB is now viewable to other members.
   * @summary Create a new demandB demand on-chain
   * @param demandBId The demandB's identifier
   */
  @Post('{demandBId}/creation')
  @Response<NotFound>(404, 'Item not found')
  @SuccessResponse('201')
  public async createDemandBOnChain(@Path() demandBId: UUID): Promise<TransactionResponse> {
    const [demandB] = await this.db.getDemandWithAttachment(demandBId, 'demand_b')
    if (!demandB) throw new NotFound('demandB')
    if (demandB.state !== 'created') throw new BadRequest(`Demand must have state: ${'created'}`)

    const extrinsic = await this.node.prepareRunProcess(demandCreate(demandB))

    const [transaction] = await this.db.insertTransaction({
      api_type: 'demand_b',
      transaction_type: 'creation',
      local_id: demandBId,
      state: 'submitted',
      hash: extrinsic.hash.toHex(),
    })

    this.node.submitRunProcess(extrinsic, this.db.updateTransactionState(transaction.id))

    return transaction
  }

  /**
   * @summary Get a demandB creation transaction by ID
   * @param demandBId The demandB's identifier
   * @param creationId The demandB's creation ID
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandBId}/creation/{creationId}')
  public async getDemandBCreation(@Path() demandBId: UUID, creationId: UUID): Promise<TransactionResponse> {
    const [demandB] = await this.db.getDemand(demandBId)
    if (!demandB) throw new NotFound('demandB')

    const [creation] = await this.db.getTransaction(creationId)
    if (!creation) throw new NotFound('creation')
    return creation
  }

  /**
   * @summary Get all of a demandAB's creation transactions
   * @param demandBId The demandAB's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandBId}/creation/')
  public async getTransactionsFromDemandAB(@Path() demandBId: UUID): Promise<TransactionResponse[]> {
    const [demandAB] = await this.db.getDemand(demandBId)
    if (!demandAB) throw new NotFound('demandAB')

    return await this.db.getTransactionsByLocalId(demandBId, 'creation')
  }
}

const responseWithAlias = async (demandB: DemandResponse): Promise<DemandResponse> => {
  const { alias: ownerAlias } = await getMemberByAddress(demandB.owner)

  return {
    id: demandB.id,
    owner: ownerAlias,
    state: demandB.state,
    parametersAttachmentId: demandB.parametersAttachmentId,
  }
}
