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
} from 'tsoa'
import type { Logger } from 'pino'
import { injectable } from 'tsyringe'

import { logger } from '../../../lib/logger'
import Database, { DemandRow, Match2Row } from '../../../lib/db'
import { BadRequest, HttpResponse, NotFound } from '../../../lib/error-handler/index'
import Identity from '../../../lib/services/identity'
import { Match2CancelRequest, Match2Request, Match2Response, Match2State } from '../../../models/match2'
import { DATE, UUID } from '../../../models/strings'
import { TransactionResponse, TransactionType } from '../../../models/transaction'
import {
  match2AcceptFinal,
  match2AcceptFirst,
  match2Cancel,
  rematch2Propose,
  match2Propose,
  match2Reject,
  rematch2AcceptFinal,
} from '../../../lib/payload'
import ChainNode from '../../../lib/chainNode'
import env from '../../../env'
import { parseDateParam } from '../../../lib/utils/queryParams'

@Route('v1/match2')
@injectable()
@Tags('match2')
@Security('BearerAuth')
export class Match2Controller extends Controller {
  log: Logger
  db: Database
  node: ChainNode

  constructor(private identity: Identity) {
    super()
    this.log = logger.child({ controller: '/match2' })
    this.db = new Database()
    this.node = new ChainNode({
      host: env.NODE_HOST,
      port: env.NODE_PORT,
      logger,
      userUri: env.USER_URI,
    })
    this.identity = identity
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
    @Body() { demandA: demandAId, demandB: demandBId, replaces }: Match2Request
  ): Promise<Match2Response | null> {
    const [demandA]: DemandRow[] = await this.db.getDemand(demandAId)
    validatePreLocal(demandA, 'DemandA', {
      subtype: 'demand_a',
      state: replaces ? 'allocated' : 'created',
    })

    const [demandB]: DemandRow[] = await this.db.getDemand(demandBId)
    validatePreLocal(demandB, 'DemandB', {
      subtype: 'demand_b',
      state: 'created',
    })

    const { address: selfAddress } = await this.identity.getMemberBySelf()

    if (replaces) {
      const [originalMatch2]: Match2Row[] = await this.db.getMatch2(replaces)
      validatePreLocal(originalMatch2, 'Match2', {
        state: 'acceptedFinal',
        demandA: demandAId,
      })
    }

    const [match2] = await this.db.insertMatch2({
      optimiser: selfAddress,
      member_a: demandA.owner,
      member_b: demandB.owner,
      state: 'pending',
      demand_a_id: demandAId,
      demand_b_id: demandBId,
      replaces_id: replaces,
    })

    return await responseWithAliases(match2, this.identity)
  }

  /**
   * Returns the details of all match2s.
   * @summary List match2s
   */
  @Get('/')
  public async getAll(@Query() updated_since?: DATE): Promise<Match2Response[]> {
    const query: { updatedSince?: Date } = {}
    if (updated_since) {
      query.updatedSince = parseDateParam(updated_since)
    }

    const match2s = await this.db.getMatch2s(query)
    const result = await Promise.all(match2s.map(async (match2) => responseWithAliases(match2, this.identity)))
    return result
  }

  /**
   * @summary Get a match2 by ID
   * @param match2Id The match2's identifier
   */
  @Response<ValidateError>(422, 'Validation Failed')
  @Response<NotFound>(404, 'Item not found')
  @Get('{match2Id}')
  public async getMatch2(@Path() match2Id: UUID): Promise<Match2Response> {
    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    return responseWithAliases(match2, this.identity)
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
    const [match2]: Match2Row[] = await this.db.getMatch2(match2Id) //new match
    validatePreLocal(match2, 'Match2', { state: 'pending' })

    let originalMatch: { match2: Match2Row; demandB: DemandRow } | null = null //old match2
    if (match2.replaces) {
      const [originalMatch2]: Match2Row[] = await this.db.getMatch2(match2.replaces)
      validatePreLocal(originalMatch2, 'Match2', { state: 'acceptedFinal' })
      const [originalDemandB]: DemandRow[] = await this.db.getDemand(originalMatch2.demandB) //old demandB
      validatePreOnChain(originalDemandB, 'DemandB', { subtype: 'demand_b', state: 'allocated' })

      originalMatch = { match2: originalMatch2, demandB: originalDemandB }
    }

    const [demandA]: DemandRow[] = await this.db.getDemand(match2.demandA)
    validatePreOnChain(demandA, 'DemandA', {
      subtype: 'demand_a',
      state: match2.replaces ? 'allocated' : 'created',
    })
    const [demandB]: DemandRow[] = await this.db.getDemand(match2.demandB) //new demandB
    validatePreOnChain(demandB, 'DemandB', { subtype: 'demand_b', state: 'created' })

    const extrinsic = originalMatch
      ? await this.node.prepareRunProcess(rematch2Propose(match2, demandA, originalMatch, demandB))
      : await this.node.prepareRunProcess(match2Propose(match2, demandA, demandB))

    const [transaction] = await this.db.insertTransaction({
      transaction_type: 'proposal',
      api_type: 'match2',
      local_id: match2Id,
      state: 'submitted',
      hash: extrinsic.hash.toHex(),
    })

    this.node.submitRunProcess(extrinsic, this.db.updateTransactionState(transaction.id))

    return transaction
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
    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    const [proposal] = await this.db.getTransaction(proposalId)
    if (!proposal) throw new NotFound('proposal')

    return proposal
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
    const query: {
      localId: UUID
      transactionType: TransactionType
      updatedSince?: Date
    } = { localId: match2Id, transactionType: 'proposal' }
    if (updated_since) {
      query.updatedSince = parseDateParam(updated_since)
    }

    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    return this.db.getTransactionsByLocalId(query)
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
  public async acceptMatch2OnChain(@Path() match2Id: UUID): Promise<TransactionResponse> {
    const [match2]: Match2Row[] = await this.db.getMatch2(match2Id)
    validatePreOnChain(match2, 'Match2', {})

    const state: Match2State = match2.state
    if (!match2.replaces && state !== 'proposed' && state !== 'acceptedA' && state !== 'acceptedB')
      throw new BadRequest(`state should not be ${state}`)

    const [demandA]: DemandRow[] = await this.db.getDemand(match2.demandA)
    validatePreOnChain(demandA, 'DemandA', {
      subtype: 'demand_a',
      state: match2.replaces ? 'allocated' : 'created',
    })

    const [demandB]: DemandRow[] = await this.db.getDemand(match2.demandB)
    validatePreOnChain(demandB, 'DemandB', { subtype: 'demand_b', state: 'created' })
    const [oldMatch2]: Match2Row[] = match2.replaces ? await this.db.getMatch2(match2.replaces) : []

    const { address: selfAddress } = await this.identity.getMemberBySelf()
    const ownsDemandA = demandA.owner === selfAddress
    const ownsDemandB = demandB.owner === selfAddress

    const acceptAB = async () => {
      const newState = ownsDemandA ? 'acceptedA' : 'acceptedB'
      const extrinsic = await this.node.prepareRunProcess(
        match2AcceptFirst(match2, newState, demandA, demandB, match2.replaces ? oldMatch2?.originalTokenId : null)
      )
      const [transaction] = await this.db.insertTransaction({
        transaction_type: 'accept',
        api_type: 'match2',
        local_id: match2Id,
        state: 'submitted',
        hash: extrinsic.hash.toHex(),
      })

      this.node.submitRunProcess(extrinsic, this.db.updateTransactionState(transaction.id))
      return transaction
    }

    const acceptFinal = async () => {
      const extrinsic = await this.node.prepareRunProcess(match2AcceptFinal(match2, demandA, demandB))

      const [transaction] = await this.db.insertTransaction({
        transaction_type: 'accept',
        api_type: 'match2',
        local_id: match2Id,
        state: 'submitted',
        hash: extrinsic.hash.toHex(),
      })

      this.node.submitRunProcess(extrinsic, this.db.updateTransactionState(transaction.id))
      return transaction
    }

    const acceptRematch = async () => {
      const [oldDemandB]: DemandRow[] = await this.db.getDemand(oldMatch2.demandB)
      const extrinsic = await this.node.prepareRunProcess(
        rematch2AcceptFinal({
          oldMatch2,
          demandA,
          oldDemandB,
          demandB,
          match2,
        })
      )
      const [transaction] = await this.db.insertTransaction({
        transaction_type: 'accept',
        api_type: 'match2',
        local_id: match2.id,
        state: 'submitted',
        hash: extrinsic.hash.toHex(),
      })
      this.node.submitRunProcess(extrinsic, this.db.updateTransactionState(transaction.id))

      return transaction
    }

    switch (state) {
      case 'proposed':
        if (!ownsDemandA && !ownsDemandB) throw new BadRequest(`You do not own an acceptable demand`)
        return acceptAB()
      case 'acceptedA':
        if (!ownsDemandB) throw new BadRequest(`You do not own an acceptable demand`)
        if (match2.replaces) return acceptRematch()
        return acceptFinal()
      case 'acceptedB':
        if (!ownsDemandA) throw new BadRequest(`You do not own an acceptable demand`)
        if (match2.replaces) return acceptRematch()
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
    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    const [accept] = await this.db.getTransaction(acceptId)
    if (!accept) throw new NotFound('accept')

    return accept
  }

  /**
   * @summary Get all of a match2's accept transactions
   * @param match2Id The match2's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/accept')
  public async getMatch2Accepts(@Path() match2Id: UUID, @Query() updated_since?: DATE): Promise<TransactionResponse[]> {
    const query: {
      localId: UUID
      transactionType: TransactionType
      updatedSince?: Date
    } = { localId: match2Id, transactionType: 'accept' }
    if (updated_since) {
      query.updatedSince = parseDateParam(updated_since)
    }

    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    return this.db.getTransactionsByLocalId(query)
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
    @Path() match2Id: UUID,
    @Body() { attachmentId }: Match2CancelRequest
  ): Promise<TransactionResponse> {
    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')
    const [demandA] = await this.db.getDemand(match2?.demandA)
    if (!demandA) throw new NotFound('demandA')
    const [demandB] = await this.db.getDemand(match2?.demandB)
    if (!demandB) throw new NotFound('demandB')
    //check if attachment exists
    const [attachment] = await this.db.getAttachment(attachmentId)
    if (!attachment) throw new BadRequest(`${attachmentId} not found`)

    const roles = [match2.memberA, match2.memberB]
    const { address: selfAddress } = await this.identity.getMemberBySelf()
    if (!roles.includes(selfAddress)) throw new BadRequest(`You do not have a role on the match2`)
    if (match2.state !== 'acceptedFinal') throw new BadRequest('Match2 state must be acceptedFinal')

    const extrinsic = await this.node.prepareRunProcess(match2Cancel(match2, demandA, demandB, attachment))
    const [transaction] = await this.db.insertTransaction({
      transaction_type: 'cancellation',
      api_type: 'match2',
      local_id: match2Id,
      state: 'submitted',
      hash: extrinsic.hash.toHex(),
    })

    await this.db.insertMatch2Comment({
      transaction_id: transaction.id,
      state: 'created',
      owner: selfAddress,
      match2: match2Id,
      attachment: attachmentId,
    })
    this.node.submitRunProcess(extrinsic, this.db.updateTransactionState(transaction.id))

    return transaction
  }

  /**
   * @summary Get all of a match2's cancellation transactions
   * @param match2Id The match2's identifier
   */
  @Response<NotFound>(404, 'Item not found.')
  @SuccessResponse('200')
  @Get('{match2Id}/cancellation')
  public async getMatch2Cancellations(@Path() match2Id: UUID): Promise<TransactionResponse[]> {
    const query: {
      localId: UUID
      transactionType: TransactionType
    } = { localId: match2Id, transactionType: 'cancellation' }

    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    return this.db.getTransactionsByLocalId(query)
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
    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    const [cancellation] = await this.db.getTransaction(cancellationId)
    if (!cancellation) throw new NotFound('cancellation')

    return cancellation
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
  public async rejectMatch2OnChain(@Path() match2Id: UUID): Promise<TransactionResponse> {
    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    const roles = [match2.memberA, match2.memberB, match2.optimiser]
    const { address: selfAddress } = await this.identity.getMemberBySelf()
    if (!roles.includes(selfAddress)) throw new BadRequest(`You do not have a role on the match2`)

    const rejectableStates: Match2State[] = ['proposed', 'acceptedA', 'acceptedB']
    if (!rejectableStates.includes(match2.state))
      throw new BadRequest(`Match2 state must be one of: ${rejectableStates.join(', ')}`)

    const extrinsic = await this.node.prepareRunProcess(match2Reject(match2))

    const [transaction] = await this.db.insertTransaction({
      transaction_type: 'rejection',
      api_type: 'match2',
      local_id: match2Id,
      state: 'submitted',
      hash: extrinsic.hash.toHex(),
    })

    this.node.submitRunProcess(extrinsic, this.db.updateTransactionState(transaction.id))
    return transaction
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
    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    const [rejection] = await this.db.getTransaction(rejectionId)
    if (!rejection) throw new NotFound('rejection')

    return rejection
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
    const query: {
      localId: UUID
      transactionType: TransactionType
      updatedSince?: Date
    } = { localId: match2Id, transactionType: 'rejection' }
    if (updated_since) {
      query.updatedSince = parseDateParam(updated_since)
    }

    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    return this.db.getTransactionsByLocalId(query)
  }
}

const responseWithAliases = async (match2: Match2Row, identity: Identity): Promise<Match2Response> => {
  const { originalTokenId, latestTokenId, ...rest } = match2

  return {
    ...rest,
    optimiser: await identity.getMemberByAddress(match2.optimiser).then(({ alias }) => alias),
    memberA: await identity.getMemberByAddress(match2.memberA).then(({ alias }) => alias),
    memberB: await identity.getMemberByAddress(match2.memberB).then(({ alias }) => alias),
    createdAt: match2.createdAt.toISOString(),
    updatedAt: match2.updatedAt.toISOString(),
    replaces: match2.replaces ? match2.replaces : undefined,
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
    latestTokenId: number | null
  },
>(
  maybeT: T | undefined,
  rowType: string,
  condition: { [key in keyof T]?: T[key] }
) => {
  validatePreLocal(maybeT, rowType, condition)
  const t = maybeT as T

  if (!t.latestTokenId) {
    throw new BadRequest(`${rowType} must be on chain`)
  }
}
