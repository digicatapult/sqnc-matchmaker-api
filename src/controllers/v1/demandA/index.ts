import type express from 'express'

import {
  ValidateError,
  Get,
  Post,
  Route,
  Path,
  Response,
  Body,
  SuccessResponse,
  Tags,
  Security,
  Query,
  Request,
} from 'tsoa'
import { inject, injectable } from 'tsyringe'

import type {
  DemandResponse,
  DemandRequest,
  DemandCommentRequest,
  DemandWithCommentsResponse,
} from '../../../models/demand.js'
import type { DATE, UUID } from '../../../models/strings.js'
import { BadRequest, NotFound } from '../../../lib/error-handler/index.js'
import { TransactionResponse } from '../../../models/transaction.js'
import { DemandController } from '../_common/demand.js'
import Identity from '../../../lib/services/identity.js'
import ChainNode from '../../../lib/chainNode.js'
import { AddressResolver } from '../../../utils/determineSelfAddress.js'
import { LoggerToken } from '../../../lib/logger.js'
import Database from '../../../lib/db/index.js'
import type { Logger } from 'pino'
import Attachment from '../../../lib/services/attachment.js'

@Route('v1/demandA')
@injectable()
@Tags('demandA')
@Security('oauth2')
export class DemandAController extends DemandController {
  constructor(
    identity: Identity,
    attachment: Attachment,
    node: ChainNode,
    addressResolver: AddressResolver,
    db: Database,
    @inject(LoggerToken) logger: Logger
  ) {
    super('demandA', identity, attachment, node, addressResolver, db, logger)
  }

  /**
   * A Member creates a new demand for a demandA by referencing an uploaded parameters file.
   * @summary Create a new demandA
   */
  @Post()
  @Response<BadRequest>(400, 'Request was invalid')
  @Response<ValidateError>(422, 'Validation Failed')
  @SuccessResponse('201')
  public async createDemandA(@Request() req: express.Request, @Body() body: DemandRequest): Promise<DemandResponse> {
    return super.createDemand(req, body)
  }

  /**
   * Returns the details of all demandAs.
   * @summary List demandAs
   */
  @Get('/')
  public async getAll(@Request() req: express.Request, @Query() updated_since?: DATE): Promise<DemandResponse[]> {
    return super.getAll(req, updated_since)
  }

  /**
   * @summary Get a demandA by ID
   * @param demandAId The demandA's identifier
   */
  @Response<NotFound>(404, 'Item not found')
  @Get('{demandAId}')
  public async getDemandA(
    @Request() req: express.Request,
    @Path() demandAId: UUID
  ): Promise<DemandWithCommentsResponse> {
    return super.getDemand(req, demandAId)
  }

  /**
   * A member creates the demandA {demandAId} on-chain. The demandA is now viewable to other members.
   * @summary Create a new demandA on-chain
   * @param demandAId The demandA's identifier
   */
  @Post('{demandAId}/creation')
  @Response<NotFound>(404, 'Item not found')
  @SuccessResponse('201')
  public async createDemandAOnChain(@Path() demandAId: UUID): Promise<TransactionResponse> {
    return super.createDemandOnChain(demandAId)
  }

  /**
   * @summary Get a demandA creation transaction by ID
   * @param demandAId The demandA's identifier
   * @param creationId The demandA's creation ID
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandAId}/creation/{creationId}')
  public async getDemandACreation(@Path() demandAId: UUID, @Path() creationId: UUID): Promise<TransactionResponse> {
    return super.getDemandCreation(demandAId, creationId)
  }

  /**
   * @summary Get all of a demandAB's creation transactions
   * @param demandAId The demandAB's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandAId}/creation/')
  public async getTransactionsFromDemandA(
    @Path() demandAId: UUID,
    @Query() updated_since?: DATE
  ): Promise<TransactionResponse[]> {
    return super.getTransactionsFromDemand(demandAId, updated_since)
  }

  /**
   * A member comments on a demandA {demandAId} on-chain.
   * @summary Comment on a demandA on-chain
   * @param demandAId The demandA's identifier
   */
  @Post('{demandAId}/comment')
  @Response<NotFound>(404, 'Item not found')
  @Response<NotFound>(400, 'Attachment not found')
  @SuccessResponse('201')
  public async createDemandACommentOnChain(
    @Request() req: express.Request,
    @Path() demandAId: UUID,
    @Body() body: DemandCommentRequest
  ): Promise<TransactionResponse> {
    return super.createDemandCommentOnChain(req, demandAId, body)
  }

  /**
   * @summary Get a demandA comment transaction by ID
   * @param demandAId The demandA's identifier
   * @param creationId The demandA's comment ID
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandAId}/comment/{commentId}')
  public async getDemandAComment(@Path() demandAId: UUID, @Path() commentId: UUID): Promise<TransactionResponse> {
    return super.getDemandComment(demandAId, commentId)
  }

  /**
   * @summary Get all of a demandA's comment transactions
   * @param demandAId The demandA's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandAId}/comment')
  public async getDemandAComments(
    @Path() demandAId: UUID,
    @Query() updated_since?: DATE
  ): Promise<TransactionResponse[]> {
    return super.getDemandComments(demandAId, updated_since)
  }
}
