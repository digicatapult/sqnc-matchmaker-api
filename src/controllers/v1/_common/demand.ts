import type { Logger } from 'pino'
import type express from 'express'

import { Controller } from 'tsoa'

import { logger } from '../../../lib/logger.js'
import Database, { DemandCommentRow, DemandRow } from '../../../lib/db/index.js'
import {
  DemandResponse,
  DemandRequest,
  DemandSubtype,
  DemandCommentRequest,
  DemandWithCommentsResponse,
} from '../../../models/demand.js'
import { DATE, UUID } from '../../../models/strings.js'
import { BadRequest, NotFound } from '../../../lib/error-handler/index.js'
import { TransactionResponse, TransactionType } from '../../../models/transaction.js'
import { demandCommentCreate, demandCreate } from '../../../lib/payload.js'
import ChainNode from '../../../lib/chainNode.js'
import { parseDateParam } from '../../../lib/utils/queryParams.js'
import Identity from '../../../lib/services/identity.js'
import { getAuthorization } from '../../../lib/utils/shared.js'

let self: { address: string; alias: string } | null = null
export class DemandController extends Controller {
  demandType: 'demandA' | 'demandB'
  dbDemandSubtype: 'demand_a' | 'demand_b'
  log: Logger
  db: Database

  constructor(
    demandType: 'demandA' | 'demandB',
    private identity: Identity,
    private node: ChainNode
  ) {
    super()
    this.demandType = demandType
    this.dbDemandSubtype = demandType === 'demandA' ? 'demand_a' : 'demand_b'
    this.log = logger.child({ controller: `/${this.demandType}` })
    this.db = new Database()
  }

  public async createDemand(req: express.Request, { parametersAttachmentId }: DemandRequest): Promise<DemandResponse> {
    const [attachment] = await this.db.getAttachment(parametersAttachmentId)
    this.log.debug('attachemt row %o', attachment)

    if (!attachment) {
      throw new BadRequest('Attachment not found')
    }

    const res = self || (await this.identity.getMemberBySelf(getAuthorization(req)))
    self = res
    const selfAddress = res.address
    const selfAlias = res.alias

    this.log.debug('demand body row %o', {
      owner: selfAddress,
      subtype: this.dbDemandSubtype,
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
    })

    const [demand] = await this.db.insertDemand({
      owner: selfAddress,
      subtype: this.dbDemandSubtype,
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
    })

    return {
      id: demand.id,
      owner: selfAlias,
      state: demand.state,
      parametersAttachmentId,
      createdAt: demand.created_at.toISOString(),
      updatedAt: demand.updated_at.toISOString(),
    }
  }

  public async getAll(req: express.Request, updated_since?: DATE): Promise<DemandResponse[]> {
    const query: { subtype: DemandSubtype; updatedSince?: Date } = { subtype: this.dbDemandSubtype }
    if (updated_since) {
      query.updatedSince = parseDateParam(updated_since)
    }

    const demands = await this.db.getDemands(query)
    const result = await Promise.all(demands.map(async (demand) => responseWithAlias(req, demand, this.identity)))
    return result
  }

  public async getDemand(req: express.Request, demandId: UUID): Promise<DemandWithCommentsResponse> {
    const [demand] = await this.db.getDemand(demandId)
    if (!demand) throw new NotFound(this.demandType)

    const comments = await this.db.getDemandComments(demandId, 'created')

    return responseWithComments(req, await responseWithAlias(req, demand, this.identity), comments, this.identity)
  }

  public async createDemandOnChain(demandId: UUID): Promise<TransactionResponse> {
    try {
      const [demand] = await this.db.getDemandWithAttachment(demandId, this.dbDemandSubtype)
      if (!demand) throw new NotFound(this.demandType)
      if (demand.state !== 'pending') throw new BadRequest(`Demand must have state: 'pending'`)

      const extrinsic = await this.node.prepareRunProcess(demandCreate(demand))

      const [transaction] = await this.db.insertTransaction({
        api_type: this.dbDemandSubtype,
        transaction_type: 'creation',
        local_id: demandId,
        state: 'submitted',
        hash: extrinsic.hash.toHex(),
      })

      this.node.submitRunProcess(extrinsic, this.db.updateTransactionState(transaction.id))

      return transaction
    } catch (e) {
      throw new Error(`Error: ${e}`)
    }
  }

  public async getDemandCreation(demandId: UUID, creationId: UUID): Promise<TransactionResponse> {
    const [demand] = await this.db.getDemand(demandId)
    if (!demand) throw new NotFound(this.demandType)

    const [creation] = await this.db.getTransaction(creationId)
    if (!creation) throw new NotFound('creation')
    return creation
  }

  public async getTransactionsFromDemand(demandId: UUID, updated_since?: DATE): Promise<TransactionResponse[]> {
    const query: {
      localId: UUID
      transactionType: TransactionType
      updatedSince?: Date
    } = { localId: demandId, transactionType: 'creation' }
    if (updated_since) {
      query.updatedSince = parseDateParam(updated_since)
    }

    const [demandAB] = await this.db.getDemand(demandId)
    if (!demandAB) throw new NotFound(this.demandType)

    return await this.db.getTransactionsByLocalId(query)
  }

  public async createDemandCommentOnChain(
    req: express.Request,
    demandId: UUID,
    { attachmentId }: DemandCommentRequest
  ): Promise<TransactionResponse> {
    const [demand] = await this.db.getDemand(demandId)
    if (!demand || demand.subtype !== this.dbDemandSubtype) throw new NotFound(this.demandType)

    const [comment] = await this.db.getAttachment(attachmentId)
    if (!comment) throw new BadRequest(`${attachmentId} not found`)

    const res = await this.identity.getMemberBySelf(getAuthorization(req))
    const selfAddress = res.address

    const extrinsic = await this.node.prepareRunProcess(demandCommentCreate(demand, comment))

    const [transaction] = await this.db.insertTransaction({
      api_type: this.dbDemandSubtype,
      transaction_type: 'comment',
      local_id: demandId,
      state: 'submitted',
      hash: extrinsic.hash.toHex(),
    })

    await this.db.insertDemandComment({
      transaction_id: transaction.id,
      state: 'pending',
      owner: selfAddress,
      demand: demandId,
      attachment: attachmentId,
    })

    this.node.submitRunProcess(extrinsic, this.db.updateTransactionState(transaction.id))

    return transaction
  }

  public async getDemandComment(demandId: UUID, commentId: UUID): Promise<TransactionResponse> {
    const [demand] = await this.db.getDemand(demandId)
    if (!demand) throw new NotFound(this.demandType)

    const [comment] = await this.db.getTransaction(commentId)
    if (!comment) throw new NotFound('comment')
    return comment
  }

  public async getDemandComments(demandId: UUID, updated_since?: DATE): Promise<TransactionResponse[]> {
    const query: {
      localId: UUID
      transactionType: TransactionType
      updatedSince?: Date
    } = { localId: demandId, transactionType: 'comment' }
    if (updated_since) {
      query.updatedSince = parseDateParam(updated_since)
    }

    const [demand] = await this.db.getDemand(demandId)
    if (!demand || demand.subtype !== this.dbDemandSubtype) throw new NotFound(this.demandType)

    return await this.db.getTransactionsByLocalId(query)
  }
}

const responseWithAlias = async (
  req: express.Request,
  demand: DemandRow,
  identity: Identity
): Promise<DemandResponse> => {
  const res = await identity.getMemberByAddress(demand.owner, getAuthorization(req))
  const ownerAlias = res.alias

  return {
    id: demand.id,
    owner: ownerAlias,
    state: demand.state,
    parametersAttachmentId: demand.parametersAttachmentId,
    createdAt: demand.createdAt.toISOString(),
    updatedAt: demand.updatedAt.toISOString(),
  }
}

const responseWithComments = async (
  req: express.Request,
  demand: DemandResponse,
  comments: DemandCommentRow[],
  identity: Identity
): Promise<DemandWithCommentsResponse> => {
  const commentors = [...new Set(comments.map((comment) => comment.owner))]
  const aliasMap = new Map(
    await Promise.all(
      commentors.map(async (commentor) => {
        const res = await identity.getMemberByAddress(commentor, getAuthorization(req))
        const alias = res.alias

        return [commentor, alias] as const
      })
    )
  )
  return {
    ...demand,
    comments: comments.map(({ attachmentId, createdAt, owner }) => ({
      attachmentId,
      createdAt: createdAt.toISOString(),
      owner: aliasMap.get(owner) as string,
    })),
  }
}
