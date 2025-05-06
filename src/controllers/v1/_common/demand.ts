import type { Logger } from 'pino'

import { Controller } from 'tsoa'

import Database from '../../../lib/db/index.js'
import type { DemandCommentRow, DemandRow } from '../../../lib/db/types.js'
import {
  DemandResponse,
  DemandRequest,
  DemandSubtype,
  DemandCommentRequest,
  DemandWithCommentsResponse,
} from '../../../models/demand.js'
import { DATE, UUID } from '../../../models/strings.js'
import { BadRequest, NotFound, Unauthorized, UnknownError } from '../../../lib/error-handler/index.js'
import { TransactionResponse } from '../../../models/transaction.js'
import { demandCommentCreate, demandCreate } from '../../../lib/payload.js'
import ChainNode from '../../../lib/chainNode.js'
import { parseDateParam } from '../../../lib/utils/queryParams.js'
import Identity from '../../../lib/services/identity.js'
import { AddressResolver } from '../../../utils/determineSelfAddress.js'
import Attachment from '../../../lib/services/attachment.js'
import { TransactionRow, Where } from '../../../lib/db/types.js'
import { dbTransactionToResponse } from '../../../utils/dbToApi.js'
import { Env } from '../../../env.js'

export class DemandController extends Controller {
  demandType: 'demandA' | 'demandB'
  dbDemandSubtype: DemandSubtype
  log: Logger
  db: Database
  env: Env

  constructor(
    demandType: 'demandA' | 'demandB',
    private identity: Identity,
    private attachment: Attachment,
    private node: ChainNode,
    private addressResolver: AddressResolver,
    db: Database,
    logger: Logger,
    env: Env
  ) {
    super()
    this.demandType = demandType
    this.dbDemandSubtype = demandType === 'demandA' ? 'demand_a' : 'demand_b'
    this.log = logger.child({ controller: `/${this.demandType}` })
    this.db = db
    this.env = env
  }

  public async createDemand({ parametersAttachmentId }: DemandRequest): Promise<DemandResponse> {
    const [attachment] = await this.attachment.getAttachments([parametersAttachmentId])

    if (!attachment) {
      throw new BadRequest('Attachment not found')
    }

    // So self should be whoever is actually making this transaction -> which is Dave if there is a PROXY_FOR env (because then Alice is a proxy for Dave)
    // He is also the one who is associated with it in a db
    const res = await this.addressResolver.determineSelfAddress()
    const selfAddress = res.address
    const selfAlias = res.alias

    const [demand] = await this.db.insert('demand', {
      owner: selfAddress,
      subtype: this.dbDemandSubtype,
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: null,
      original_token_id: null,
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

  public async getAll(updated_since?: DATE): Promise<DemandResponse[]> {
    const query: Where<'demand'> = [['subtype', '=', this.dbDemandSubtype]]
    if (updated_since) {
      query.push(['updated_at', '>', parseDateParam(updated_since)])
    }
    const selfAddress = (await this.addressResolver.determineSelfAddress()).address
    const roles = this.env.ROLES
    const demands: DemandRow[] = []

    if (roles.includes('optimiser') || roles.includes('admin')) {
      // Privileged roles get all demands matching base query
      demands.push(...(await this.db.get('demand', query)))
      return await Promise.all(demands.map(async (demand) => responseWithAlias(demand, this.identity)))
    }
    // Owner's own demands
    const ownedQuery: Where<'demand'> = [['owner', '=', selfAddress]]
    if (updated_since) {
      ownedQuery.push(['updated_at', '>', parseDateParam(updated_since)])
    }
    const ownedDemands = await this.db.get('demand', ownedQuery)

    if (ownedDemands.length === 0) {
      return await Promise.all(demands.map(async (demand) => responseWithAlias(demand, this.identity)))
    }

    demands.push(...ownedDemands.filter((demand) => demand.subtype === this.dbDemandSubtype))

    const ownedDemandsOppositeSubTypeIds = ownedDemands
      .filter((demand) => demand.subtype !== this.dbDemandSubtype)
      .map((demand) => demand.id)

    // Get all demands that are matched with the users demands
    const match2Query: Where<'match2'> = [
      [this.demandType === 'demandA' ? 'demand_b_id' : 'demand_a_id', 'IN', ownedDemandsOppositeSubTypeIds],
    ]
    const matches = await this.db.get('match2', match2Query)
    const notOwnedDemandIds = matches.map((m) => (this.dbDemandSubtype === 'demand_a' ? m.demand_a_id : m.demand_b_id))
    if (notOwnedDemandIds.length > 0) {
      const matchedQuery: Where<'demand'> = [...query, ['id', 'IN', notOwnedDemandIds]]
      if (updated_since) {
        matchedQuery.push(['updated_at', '>', parseDateParam(updated_since)])
      }
      demands.push(...(await this.db.get('demand', matchedQuery)))
    }

    return await Promise.all(demands.map(async (demand) => responseWithAlias(demand, this.identity)))
  }

  public async getDemand(demandId: UUID): Promise<DemandWithCommentsResponse> {
    const [demand] = await this.db.get('demand', { id: demandId, subtype: this.dbDemandSubtype })
    if (!demand) throw new NotFound(this.demandType)
    // If you can view the demand, you are a admin optimiser
    if (!(await this.canAccessDemand(demand, 'read'))) {
      throw new NotFound(this.demandType)
    }

    const comments = await this.db.get('demand_comment', { demand: demandId, state: 'created' }, [
      ['created_at', 'asc'],
    ])

    return responseWithComments(await responseWithAlias(demand, this.identity), comments, this.identity)
  }

  public async createDemandOnChain(demandId: UUID): Promise<TransactionResponse> {
    const [demand] = await this.db.get('demand', { id: demandId, subtype: this.dbDemandSubtype })
    if (!demand) throw new NotFound(this.demandType)

    if (!(await this.canAccessDemand(demand, 'createOnChain'))) {
      if (!(await this.canAccessDemand(demand, 'read'))) {
        throw new NotFound(this.demandType)
      }
      throw new Unauthorized(`You are not allowed to create demand ${demandId} on-chain`)
    }

    if (demand.state !== 'pending') throw new BadRequest(`Demand must have state: 'pending'`)

    const [attachment] = await this.attachment.getAttachments([demand.parameters_attachment_id])
    if (!attachment) throw new UnknownError()

    const extrinsic = await this.node.prepareRunProcess(demandCreate(demand, attachment))

    const [transaction] = await this.db.insert('transaction', {
      api_type: this.dbDemandSubtype,
      transaction_type: 'creation',
      local_id: demandId,
      state: 'submitted',
      hash: extrinsic.hash.toHex().slice(2),
    })

    await this.node.submitRunProcess(extrinsic, async (state: TransactionRow['state']) => {
      await this.db.update('transaction', { id: transaction.id }, { state })
    })

    return dbTransactionToResponse(transaction)
  }

  public async getDemandCreation(demandId: UUID, creationId: UUID): Promise<TransactionResponse> {
    const [demand] = await this.db.get('demand', { id: demandId, subtype: this.dbDemandSubtype })
    if (!demand) throw new NotFound(this.demandType)

    if (!(await this.canAccessDemand(demand, 'read'))) {
      throw new NotFound(this.demandType)
    }

    const [creation] = await this.db.get('transaction', {
      id: creationId,
      local_id: demand.id,
      transaction_type: 'creation',
    })
    if (!creation) throw new NotFound('creation')
    return dbTransactionToResponse(creation)
  }

  public async getDemandCreations(demandId: UUID, updated_since?: DATE): Promise<TransactionResponse[]> {
    const query: Where<'transaction'> = [
      ['local_id', '=', demandId],
      ['transaction_type', '=', 'creation'],
    ]
    if (updated_since) {
      query.push(['updated_at', '>', parseDateParam(updated_since)])
    }

    const [demandAB] = await this.db.get('demand', { id: demandId, subtype: this.dbDemandSubtype })
    if (!demandAB) throw new NotFound(this.demandType)

    if (!(await this.canAccessDemand(demandAB, 'read'))) {
      throw new NotFound(this.demandType)
    }

    const dbTxs = await this.db.get('transaction', query)
    return dbTxs.map(dbTransactionToResponse)
  }

  public async createDemandCommentOnChain(
    demandId: UUID,
    { attachmentId }: DemandCommentRequest
  ): Promise<TransactionResponse> {
    const [demand] = await this.db.get('demand', { id: demandId, subtype: this.dbDemandSubtype })
    if (!demand) throw new NotFound(this.demandType)

    if (!(await this.canAccessDemand(demand, 'createOnChain'))) {
      if (!(await this.canAccessDemand(demand, 'read'))) {
        throw new NotFound(this.demandType)
      }
      throw new Unauthorized(`You are not allowed to create demand ${demandId} on-chain`)
    }

    const [comment] = await this.attachment.getAttachments([attachmentId])
    if (!comment) throw new BadRequest(`${attachmentId} not found`)

    const res = await this.identity.getMemberBySelf()
    const selfAddress = res.address

    const extrinsic = await this.node.prepareRunProcess(demandCommentCreate(demand, comment))

    const [transaction] = await this.db.insert('transaction', {
      api_type: this.dbDemandSubtype,
      transaction_type: 'comment',
      local_id: demandId,
      state: 'submitted',
      hash: extrinsic.hash.toHex().slice(2),
    })

    await this.db.insert('demand_comment', {
      transaction_id: transaction.id,
      state: 'pending',
      owner: selfAddress,
      demand: demandId,
      attachment_id: attachmentId,
    })

    await this.node.submitRunProcess(extrinsic, async (state) => {
      await this.db.update('transaction', { id: transaction.id }, { state })
    })

    return dbTransactionToResponse(transaction)
  }

  public async getDemandComment(demandId: UUID, commentId: UUID): Promise<TransactionResponse> {
    const [demand] = await this.db.get('demand', { id: demandId, subtype: this.dbDemandSubtype })
    if (!demand) throw new NotFound(this.demandType)

    if (!(await this.canAccessDemand(demand, 'read'))) {
      throw new NotFound(this.demandType)
    }

    const [comment] = await this.db.get('transaction', {
      id: commentId,
      local_id: demand.id,
      transaction_type: 'comment',
    })
    if (!comment) throw new NotFound('comment')
    return dbTransactionToResponse(comment)
  }

  public async getDemandComments(demandId: UUID, updated_since?: DATE): Promise<TransactionResponse[]> {
    const query: Where<'transaction'> = [
      ['local_id', '=', demandId],
      ['transaction_type', '=', 'comment'],
    ]
    if (updated_since) {
      query.push(['updated_at', '>', parseDateParam(updated_since)])
    }

    const [demand] = await this.db.get('demand', { id: demandId, subtype: this.dbDemandSubtype })
    if (!demand) throw new NotFound(this.demandType)

    if (!(await this.canAccessDemand(demand, 'read'))) {
      throw new Unauthorized('You are not allowed to view this demand')
    }

    const dbTxs = await this.db.get('transaction', query)
    return dbTxs.map(dbTransactionToResponse)
  }

  public async canAccessDemand(demand: DemandRow, accessType: 'read' | 'createOnChain'): Promise<boolean> {
    const roles = this.env.ROLES
    const member = await this.addressResolver.determineSelfAddress()

    if (accessType === 'createOnChain') {
      if (roles.includes('admin')) return true
      if (demand.owner === member.address) return true
      return false
    }
    if (accessType === 'read') {
      if (roles.includes('admin') || roles.includes('optimizer')) return true
      if (demand.owner === member.address) return true
      const query: Where<'match2'> = [[this.demandType === 'demandA' ? 'demand_a_id' : 'demand_b_id', '=', demand.id]]
      const [match] = await this.db.get('match2', query)
      if (!match) return false
      return [match.member_a, match.member_b].includes(member.address)
    }
    return false
  }
}

const responseWithAlias = async (demand: DemandRow, identity: Identity): Promise<DemandResponse> => {
  const res = await identity.getMemberByAddress(demand.owner)
  const ownerAlias = res.alias

  return {
    id: demand.id,
    owner: ownerAlias,
    state: demand.state,
    parametersAttachmentId: demand.parameters_attachment_id,
    createdAt: demand.created_at.toISOString(),
    updatedAt: demand.updated_at.toISOString(),
  }
}

const responseWithComments = async (
  demand: DemandResponse,
  comments: DemandCommentRow[],
  identity: Identity
): Promise<DemandWithCommentsResponse> => {
  const commentors = [...new Set(comments.map((comment) => comment.owner))]
  const aliasMap = new Map(
    await Promise.all(
      commentors.map(async (commentor) => {
        const res = await identity.getMemberByAddress(commentor)
        const alias = res.alias

        return [commentor, alias] as const
      })
    )
  )
  return {
    ...demand,
    comments: comments.map(({ attachment_id, created_at, owner }) => ({
      attachmentId: attachment_id,
      createdAt: created_at.toISOString(),
      owner: aliasMap.get(owner) as string,
    })),
  }
}
