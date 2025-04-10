import type express from 'express'

import {
  ValidateError,
  Controller,
  Post,
  Get,
  Route,
  Response,
  Body,
  SuccessResponse,
  Tags,
  Security,
  Path,
  Query,
  Request,
} from 'tsoa'
import type { Logger } from 'pino'
import { inject, injectable } from 'tsyringe'

import { LoggerToken } from '../../../lib/logger.js'
import Database from '../../../lib/db/index.js'
import { BadRequest, HttpResponse, NotFound } from '../../../lib/error-handler/index.js'
import Identity from '../../../lib/services/identity.js'
import {
  type Match2CancelRequest,
  type Match2Request,
  type Match2State,
  Match2Response,
} from '../../../models/match2.js'

import type { DATE, UUID } from '../../../models/strings.js'

import { TransactionResponse } from '../../../models/transaction.js'
import {
  match2AcceptFinal,
  match2AcceptFirst,
  match2Cancel,
  rematch2Propose,
  match2Propose,
  match2Reject,
  rematch2AcceptFinal,
} from '../../../lib/payload.js'
import ChainNode from '../../../lib/chainNode.js'
import { parseDateParam } from '../../../lib/utils/queryParams.js'
import { getAuthorization } from '../../../lib/utils/shared.js'
import { AddressResolver } from '../../../utils/determineSelfAddress.js'
import Attachment from '../../../lib/services/attachment.js'
import { DemandRow, Match2Row, Where } from '../../../lib/db/types.js'
import { dbTransactionToResponse } from '../../../utils/dbToApi.js'

@Route('v1/match2')
@injectable()
@Tags('match2')
@Security('oauth2')
export class Match2Controller extends Controller {
  log: Logger
  db: Database

  constructor(
    private identity: Identity,
    private attachment: Attachment,
    private node: ChainNode,
    private addressResolver: AddressResolver,
    db: Database,
    @inject(LoggerToken) logger: Logger
  ) {
    super()
    this.log = logger.child({ controller: '/match2' })
    this.db = db
  }

  /**
   * A Member proposes a new match2 for a demandA and a demandB by referencing each demand.
   * @summary Propose a new match2
   */
  @Post()
  @Response<BadRequest>(400, 'Request was invalid')
  @Response<ValidateError>(422, 'Validation Failed')
  @SuccessResponse('201')
  public async proposeMatch2(
    @Request() req: express.Request,
    @Body() body: Match2Request
  ): Promise<Match2Response | null> {
    const { demandA: demandAId, demandB: demandBId, replaces } = body
    const [demandA] = await this.db.get('demand', { id: demandAId })
    validatePreLocal(demandA, 'DemandA', {
      subtype: 'demand_a',
      state: replaces ? 'allocated' : 'created',
    })

    const [demandB] = await this.db.get('demand', { id: demandBId })
    validatePreLocal(demandB, 'DemandB', {
      subtype: 'demand_b',
      state: 'created',
    })

    const { address: selfAddress } = await this.addressResolver.determineSelfAddress(req)

    if (replaces) {
      const [originalMatch2] = await this.db.get('match2', { id: replaces })
      validatePreLocal(originalMatch2, 'Match2', {
        state: 'acceptedFinal',
        demand_a_id: demandAId,
      })
    }

    const [match2] = await this.db.insert('match2', {
      optimiser: selfAddress,
      member_a: demandA.owner,
      member_b: demandB.owner,
      state: 'pending',
      demand_a_id: demandAId,
      demand_b_id: demandBId,
      latest_token_id: null,
      original_token_id: null,
      replaces_id: replaces || null,
    })

    return await responseWithAliases(req, match2, this.identity)
  }

  /**
   * Returns the details of all match2s.
   * @summary List match2s
   */
  @Get('/')
  public async getAll(@Request() req: express.Request, @Query() updated_since?: DATE): Promise<Match2Response[]> {
    const query: Where<'match2'> = []
    if (updated_since) query.push(['updated_at', '>', parseDateParam(updated_since)])

    const match2s = await this.db.get('match2', query)
    const result = await Promise.all(match2s.map(async (match2) => responseWithAliases(req, match2, this.identity)))
    return result
  }

  /**
   * @summary Get a match2 by ID
   * @param match2Id The match2's identifier
   */
  @Response<ValidateError>(422, 'Validation Failed')
  @Response<NotFound>(404, 'Item not found')
  @Get('{match2Id}')
  public async getMatch2(@Request() req: express.Request, @Path() match2Id: UUID): Promise<Match2Response> {
    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    return responseWithAliases(req, match2, this.identity)
  }

  /**
   * An optimiser creates the match2 {match2Id} on-chain. The match2 is now viewable to other members.
   * @summary Create a new match2 on-chain
   * @param match2Id The match2's identifier
   */
  @Post('{match2Id}/proposal')
  @Response<NotFound>(404, 'Item not found')
  @Response<BadRequest>(400, 'Request was invalid')
  @SuccessResponse('201')
  public async proposeMatch2OnChain(@Path() match2Id: UUID): Promise<TransactionResponse> {
    const [match2] = await this.db.get('match2', { id: match2Id }) //new match
    validatePreLocal(match2, 'Match2', { state: 'pending' })

    let originalMatch: { match2: Match2Row; demandB: DemandRow } | null = null //old match2
    if (match2.replaces_id) {
      const [originalMatch2] = await this.db.get('match2', { id: match2.replaces_id })
      validatePreLocal(originalMatch2, 'Match2', { state: 'acceptedFinal' })
      const [originalDemandB] = await this.db.get('demand', { id: originalMatch2.demand_b_id }) //old demandB
      validatePreOnChain(originalDemandB, 'DemandB', { subtype: 'demand_b', state: 'allocated' })

      originalMatch = { match2: originalMatch2, demandB: originalDemandB }
    }

    const [demandA] = await this.db.get('demand', { id: match2.demand_a_id })
    validatePreOnChain(demandA, 'DemandA', {
      subtype: 'demand_a',
      state: match2.replaces_id ? 'allocated' : 'created',
    })
    const [demandB] = await this.db.get('demand', { id: match2.demand_b_id }) //new demandB
    validatePreOnChain(demandB, 'DemandB', { subtype: 'demand_b', state: 'created' })

    const extrinsic = originalMatch
      ? await this.node.prepareRunProcess(rematch2Propose(match2, demandA, originalMatch, demandB))
      : await this.node.prepareRunProcess(match2Propose(match2, demandA, demandB))

    const [transaction] = await this.db.insert('transaction', {
      transaction_type: 'proposal',
      api_type: 'match2',
      local_id: match2Id,
      state: 'submitted',
      hash: extrinsic.hash.toHex().slice(2),
    })

    await this.node.submitRunProcess(extrinsic, async (state) => {
      await this.db.update('transaction', { id: transaction.id }, { state })
    })

    return dbTransactionToResponse(transaction)
  }

  /**
   * @summary Get a match2 proposal transaction by ID
   * @param match2Id The match2's identifier
   * @param proposalId The match2's proposal ID
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/proposal/{proposalId}')
  public async getMatch2Proposal(@Path() match2Id: UUID, proposalId: UUID): Promise<TransactionResponse> {
    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    // TODO: add test
    const [proposal] = await this.db.get('transaction', {
      id: proposalId,
      local_id: match2.id,
      transaction_type: 'proposal',
    })
    if (!proposal) throw new NotFound('proposal')

    return dbTransactionToResponse(proposal)
  }

  /**
   * @summary Get all of a match2's proposal transactions
   * @param match2Id The match2's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/proposal')
  public async getMatch2Proposals(
    @Path() match2Id: UUID,
    @Query() updated_since?: DATE
  ): Promise<TransactionResponse[]> {
    const query: Where<'transaction'> = [
      ['local_id', '=', match2Id],
      ['transaction_type', '=', 'proposal'],
    ]
    if (updated_since) query.push(['updated_at', '>', parseDateParam(updated_since)])

    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    const dbTxs = await this.db.get('transaction', query)
    return dbTxs.map(dbTransactionToResponse)
  }

  /**
   * A member accepts a match2 {match2Id} on-chain.
   * If all members have accepted, its demands are allocated and can no longer be used in other match2s.
   * @summary Accept a match2 on-chain
   * @param match2Id The match2's identifier
   */
  @Post('{match2Id}/accept')
  @Response<NotFound>(404, 'Item not found')
  @Response<BadRequest>(400, 'Request was invalid')
  @SuccessResponse('201')
  public async acceptMatch2OnChain(
    @Request() req: express.Request,
    @Path() match2Id: UUID
  ): Promise<TransactionResponse> {
    const [match2] = await this.db.get('match2', { id: match2Id })
    validatePreOnChain(match2, 'Match2', {})

    const state: Match2State = match2.state
    if (!match2.replaces_id && state !== 'proposed' && state !== 'acceptedA' && state !== 'acceptedB')
      throw new BadRequest(`state should not be ${state}`)

    const [demandA] = await this.db.get('demand', { id: match2.demand_a_id })
    validatePreOnChain(demandA, 'DemandA', {
      subtype: 'demand_a',
      state: match2.replaces_id ? 'allocated' : 'created',
    })

    const [demandB] = await this.db.get('demand', { id: match2.demand_b_id })
    validatePreOnChain(demandB, 'DemandB', { subtype: 'demand_b', state: 'created' })
    const [oldMatch2] = match2.replaces_id ? await this.db.get('match2', { id: match2.replaces_id }) : []

    const { address: selfAddress } = await this.addressResolver.determineSelfAddress(req)
    const ownsDemandA = demandA.owner === selfAddress
    const ownsDemandB = demandB.owner === selfAddress

    const acceptAB = async () => {
      const newState = ownsDemandA ? 'acceptedA' : 'acceptedB'
      const extrinsic = await this.node.prepareRunProcess(
        match2AcceptFirst(match2, newState, demandA, demandB, match2.replaces_id ? oldMatch2?.original_token_id : null)
      )
      const [transaction] = await this.db.insert('transaction', {
        transaction_type: 'accept',
        api_type: 'match2',
        local_id: match2Id,
        state: 'submitted',
        hash: extrinsic.hash.toHex().slice(2),
      })

      await this.node.submitRunProcess(extrinsic, async (state) => {
        await this.db.update('transaction', { id: transaction.id }, { state })
      })

      return dbTransactionToResponse(transaction)
    }

    const acceptFinal = async () => {
      const extrinsic = await this.node.prepareRunProcess(match2AcceptFinal(match2, demandA, demandB))

      const [transaction] = await this.db.insert('transaction', {
        transaction_type: 'accept',
        api_type: 'match2',
        local_id: match2Id,
        state: 'submitted',
        hash: extrinsic.hash.toHex().slice(2),
      })

      await this.node.submitRunProcess(extrinsic, async (state) => {
        await this.db.update('transaction', { id: transaction.id }, { state })
      })
      return dbTransactionToResponse(transaction)
    }

    const acceptRematch = async () => {
      const [oldDemandB] = await this.db.get('demand', { id: oldMatch2.demand_b_id })
      const extrinsic = await this.node.prepareRunProcess(
        rematch2AcceptFinal({
          oldMatch2,
          demandA,
          oldDemandB,
          demandB,
          match2,
        })
      )
      const [transaction] = await this.db.insert('transaction', {
        transaction_type: 'accept',
        api_type: 'match2',
        local_id: match2.id,
        state: 'submitted',
        hash: extrinsic.hash.toHex().slice(2),
      })
      await this.node.submitRunProcess(extrinsic, async (state) => {
        await this.db.update('transaction', { id: transaction.id }, { state })
      })

      return dbTransactionToResponse(transaction)
    }

    switch (state) {
      case 'proposed':
        if (!ownsDemandA && !ownsDemandB) throw new BadRequest(`You do not own an acceptable demand`)
        return acceptAB()
      case 'acceptedA':
        if (!ownsDemandB) throw new BadRequest(`You do not own an acceptable demand`)
        if (match2.replaces_id) return acceptRematch()
        return acceptFinal()
      case 'acceptedB':
        if (!ownsDemandA) throw new BadRequest(`You do not own an acceptable demand`)
        if (match2.replaces_id) return acceptRematch()
        return acceptFinal()
      default:
        throw new HttpResponse({})
    }
  }

  /**
   * @summary Get a match2 accept transaction by ID
   * @param match2Id The match2's identifier
   * @param acceptId The match2's accept ID
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/accept/{acceptId}')
  public async getMatch2Accept(@Path() match2Id: UUID, acceptId: UUID): Promise<TransactionResponse> {
    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    // TODO: add test
    const [accept] = await this.db.get('transaction', { id: acceptId, local_id: match2.id, transaction_type: 'accept' })
    if (!accept) throw new NotFound('accept')

    return dbTransactionToResponse(accept)
  }

  /**
   * @summary Get all of a match2's accept transactions
   * @param match2Id The match2's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/accept')
  public async getMatch2Accepts(@Path() match2Id: UUID, @Query() updated_since?: DATE): Promise<TransactionResponse[]> {
    const query: Where<'transaction'> = [
      ['local_id', '=', match2Id],
      ['transaction_type', '=', 'accept'],
    ]
    if (updated_since) query.push(['updated_at', '>', parseDateParam(updated_since)])

    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    const dbTxs = await this.db.get('transaction', query)
    return dbTxs.map(dbTransactionToResponse)
  }

  /**
   * A member cancels a match2 {match2Id} on-chain.
   * @summary Cancel a match2 on-chain
   * @param match2Id The match2's identifier
   */
  @Post('{match2Id}/cancellation')
  @Response<NotFound>(404, 'Item not found')
  @Response<BadRequest>(400, 'Request was invalid')
  @SuccessResponse('200')
  public async cancelMatch2OnChain(
    @Request() req: express.Request,
    @Path() match2Id: UUID,
    @Body() body: Match2CancelRequest
  ): Promise<TransactionResponse> {
    const { attachmentId } = body
    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')
    const [demandA] = await this.db.get('demand', { id: match2?.demand_a_id })
    if (!demandA) throw new NotFound('demandA')
    const [demandB] = await this.db.get('demand', { id: match2?.demand_b_id })
    if (!demandB) throw new NotFound('demandB')
    //check if attachment exists
    const [attachment] = await this.attachment.getAttachments([attachmentId])
    if (!attachment) throw new BadRequest(`${attachmentId} not found`)

    const roles = [match2.member_a, match2.member_b]

    const { address: selfAddress } = await this.addressResolver.determineSelfAddress(req)

    if (!roles.includes(selfAddress)) throw new BadRequest(`You do not have a role on the match2`)
    if (match2.state !== 'acceptedFinal') throw new BadRequest('Match2 state must be acceptedFinal')

    const extrinsic = await this.node.prepareRunProcess(match2Cancel(match2, demandA, demandB, attachment))
    const [transaction] = await this.db.insert('transaction', {
      transaction_type: 'cancellation',
      api_type: 'match2',
      local_id: match2Id,
      state: 'submitted',
      hash: extrinsic.hash.toHex().slice(2),
    })

    await this.db.insert('match2_comment', {
      transaction_id: transaction.id,
      state: 'created',
      owner: selfAddress,
      match2: match2Id,
      attachment_id: attachmentId,
    })
    await this.node.submitRunProcess(extrinsic, async (state) => {
      await this.db.update('transaction', { id: transaction.id }, { state })
    })

    return dbTransactionToResponse(transaction)
  }

  /**
   * @summary Get all of a match2's cancellation transactions
   * @param match2Id The match2's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/cancellation')
  public async getMatch2Cancellations(
    @Path() match2Id: UUID,
    @Query() updated_since?: DATE
  ): Promise<TransactionResponse[]> {
    const query: Where<'transaction'> = [
      ['local_id', '=', match2Id],
      ['transaction_type', '=', 'cancellation'],
    ]
    if (updated_since) query.push(['updated_at', '>', parseDateParam(updated_since)])

    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    const dbTxs = await this.db.get('transaction', query)
    return dbTxs.map(dbTransactionToResponse)
  }

  /**
   * @summary Get a match2 cancellation transaction by ID
   * @param match2Id The match2's identifier
   * @param cancellationId The match2's rejection ID
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/cancellation/{cancellationId}')
  public async getMatch2Cancellation(@Path() match2Id: UUID, cancellationId: UUID): Promise<TransactionResponse> {
    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    const [cancellation] = await this.db.get('transaction', {
      id: cancellationId,
      local_id: match2.id,
      transaction_type: 'cancellation',
    })
    if (!cancellation) throw new NotFound('cancellation')

    return dbTransactionToResponse(cancellation)
  }

  /**
   * A member rejects a match2 {match2Id} on-chain.
   * @summary Reject a match2 on-chain
   * @param match2Id The match2's identifier
   */
  @Post('{match2Id}/rejection')
  @Response<NotFound>(404, 'Item not found')
  @Response<BadRequest>(400, 'Request was invalid')
  @SuccessResponse('200')
  public async rejectMatch2OnChain(
    @Request() req: express.Request,
    @Path() match2Id: UUID
  ): Promise<TransactionResponse> {
    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    const roles = [match2.member_a, match2.member_b, match2.optimiser]

    const { address: selfAddress } = await this.addressResolver.determineSelfAddress(req)
    if (!roles.includes(selfAddress)) throw new BadRequest(`You do not have a role on the match2`)

    const rejectableStates: Match2State[] = ['proposed', 'acceptedA', 'acceptedB']
    if (!rejectableStates.includes(match2.state))
      throw new BadRequest(`Match2 state must be one of: ${rejectableStates.join(', ')}`)

    const extrinsic = await this.node.prepareRunProcess(match2Reject(match2))

    const [transaction] = await this.db.insert('transaction', {
      transaction_type: 'rejection',
      api_type: 'match2',
      local_id: match2Id,
      state: 'submitted',
      hash: extrinsic.hash.toHex().slice(2),
    })

    await this.node.submitRunProcess(extrinsic, async (state) => {
      await this.db.update('transaction', { id: transaction.id }, { state })
    })
    return dbTransactionToResponse(transaction)
  }

  /**
   * @summary Get a match2 rejection transaction by ID
   * @param match2Id The match2's identifier
   * @param rejectionId The match2's rejection ID
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/rejection/{rejectionId}')
  public async getMatch2Rejection(@Path() match2Id: UUID, rejectionId: UUID): Promise<TransactionResponse> {
    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    const [rejection] = await this.db.get('transaction', {
      id: rejectionId,
      local_id: match2.id,
      transaction_type: 'rejection',
    })
    if (!rejection) throw new NotFound('rejection')

    return dbTransactionToResponse(rejection)
  }

  /**
   * @summary Get all of a match2's rejection transactions
   * @param match2Id The match2's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/rejection')
  public async getMatch2Rejections(
    @Path() match2Id: UUID,
    @Query() updated_since?: DATE
  ): Promise<TransactionResponse[]> {
    const query: Where<'transaction'> = [
      ['local_id', '=', match2Id],
      ['transaction_type', '=', 'rejection'],
    ]
    if (updated_since) {
      query.push(['updated_at', '>', parseDateParam(updated_since)])
    }

    const [match2] = await this.db.get('match2', { id: match2Id })
    if (!match2) throw new NotFound('match2')

    const dbTxs = await this.db.get('transaction', query)
    return dbTxs.map(dbTransactionToResponse)
  }
}

const responseWithAliases = async (
  req: express.Request,
  match2: Match2Row,
  identity: Identity
): Promise<Match2Response> => {
  const authorization = getAuthorization(req)

  return {
    id: match2.id,
    demandA: match2.demand_a_id,
    demandB: match2.demand_b_id,
    state: match2.state,
    optimiser: await identity.getMemberByAddress(match2.optimiser, authorization).then(getAlias),
    memberA: await identity.getMemberByAddress(match2.member_a, authorization).then(getAlias),
    memberB: await identity.getMemberByAddress(match2.member_b, authorization).then(getAlias),
    createdAt: match2.created_at.toISOString(),
    updatedAt: match2.updated_at.toISOString(),
    replaces: match2.replaces_id ?? undefined,
  }
}

const validatePreLocal = <T>(maybeT: T | undefined, rowType: string, condition: { [key in keyof T]?: T[key] }) => {
  if (!maybeT) {
    throw new BadRequest(`${rowType} not found`)
  }

  const conditionKeys = Object.keys(condition) as (keyof T)[]
  for (const key of conditionKeys) {
    if (maybeT[key] !== condition[key]) {
      throw new BadRequest(`${String(key)} must be ${condition[key]}, is: ${maybeT[key]}`)
    }
  }
}

const validatePreOnChain = <
  T extends {
    latest_token_id: number | null
  },
>(
  maybeT: T | undefined,
  rowType: string,
  condition: { [key in keyof T]?: T[key] }
) => {
  validatePreLocal(maybeT, rowType, condition)
  const t = maybeT as T

  if (!t.latest_token_id) {
    throw new BadRequest(`${rowType} must be on chain`)
  }
}

const getAlias = (res: { alias: string }): string => {
  return res.alias
}
