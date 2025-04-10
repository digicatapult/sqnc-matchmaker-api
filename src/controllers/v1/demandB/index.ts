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
import Database from '../../../lib/db/index.js'
import { LoggerToken } from '../../../lib/logger.js'
import type { Logger } from 'pino'
import Attachment from '../../../lib/services/attachment.js'

@Route('v1/demandB')
@Tags('demandB')
@Security('oauth2')
@injectable()
export class DemandBController extends DemandController {
  constructor(
    identity: Identity,
    attachment: Attachment,
    node: ChainNode,
    addressResolver: AddressResolver,
    db: Database,
    @inject(LoggerToken) logger: Logger
  ) {
    super('demandB', identity, attachment, node, addressResolver, db, logger)
  }

  /**
   * A Member creates a new demand for a demandB by referencing an uploaded parameters file.
   * @summary Create a new demandB
   */
  @Post()
  @Response<BadRequest>(400, 'Request was invalid')
  @Response<ValidateError>(422, 'Validation Failed')
  @SuccessResponse('201')
  public async createDemandB(@Request() req: express.Request, @Body() body: DemandRequest): Promise<DemandResponse> {
    return super.createDemand(req, body)
  }

  /**
   * Returns the details of all demandBs.
   * @summary List demandBs
   */
  @Get('/')
  public async getAll(@Request() req: express.Request, @Query() updated_since?: DATE): Promise<DemandResponse[]> {
    return super.getAll(req, updated_since)
  }

  /**
   * @summary Get a demandB by ID
   * @param demandBId The demandB's identifier
   */
  @Response<NotFound>(404, 'Item not found')
  @Get('{demandBId}')
  public async getDemandB(
    @Request() req: express.Request,
    @Path() demandBId: UUID
  ): Promise<DemandWithCommentsResponse> {
    return super.getDemand(req, demandBId)
  }

  /**
   * A member creates the demandB {demandBId} on-chain. The demandB is now viewable to other members.
   * @summary Create a new demandB on-chain
   * @param demandBId The demandB's identifier
   */
  @Post('{demandBId}/creation')
  @Response<NotFound>(404, 'Item not found')
  @SuccessResponse('201')
  public async createDemandBOnChain(@Path() demandBId: UUID): Promise<TransactionResponse> {
    return super.createDemandOnChain(demandBId)
  }

  /**
   * @summary Get a demandB creation transaction by ID
   * @param demandBId The demandB's identifier
   * @param creationId The demandB's creation ID
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandBId}/creation/{creationId}')
  public async getDemandBCreation(@Path() demandBId: UUID, @Path() creationId: UUID): Promise<TransactionResponse> {
    return super.getDemandCreation(demandBId, creationId)
  }

  /**
   * @summary Get all of a demandAB's creation transactions
   * @param demandBId The demandAB's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandBId}/creation/')
  public async getTransactionsFromDemandB(
    @Path() demandBId: UUID,
    @Query() updated_since?: DATE
  ): Promise<TransactionResponse[]> {
    return super.getDemandCreations(demandBId, updated_since)
  }

  /**
   * A member comments on a demandB {demandBId} on-chain.
   * @summary Comment on a demandB on-chain
   * @param demandBId The demandB's identifier
   */
  @Post('{demandBId}/comment')
  @Response<NotFound>(404, 'Item not found')
  @Response<NotFound>(400, 'Attachment not found')
  @SuccessResponse('201')
  public async createDemandBCommentOnChain(
    @Request() req: express.Request,
    @Path() demandBId: UUID,
    @Body() body: DemandCommentRequest
  ): Promise<TransactionResponse> {
    return super.createDemandCommentOnChain(req, demandBId, body)
  }

  /**
   * @summary Get a demandB comment transaction by ID
   * @param demandBId The demandB's identifier
   * @param creationId The demandB's comment ID
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandBId}/comment/{commentId}')
  public async getDemandBComment(@Path() demandBId: UUID, @Path() commentId: UUID): Promise<TransactionResponse> {
    return super.getDemandComment(demandBId, commentId)
  }

  /**
   * @summary Get all of a demandB's comment transactions
   * @param demandBId The demandB's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{demandBId}/comment')
  public async getDemandBComments(
    @Path() demandBId: UUID,
    @Query() updated_since?: DATE
  ): Promise<TransactionResponse[]> {
    return super.getDemandComments(demandBId, updated_since)
  }
}
