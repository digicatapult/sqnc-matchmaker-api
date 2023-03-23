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
} from 'tsoa'
import type { Logger } from 'pino'

import { logger } from '../../lib/logger'
import Database from '../../lib/db'
import { BadRequest, NotFound } from '../../lib/error-handler/index'
import { getMemberByAddress, getMemberBySelf } from '../../lib/services/identity'
import { Match2Request, Match2Response, Match2State } from '../../models/match2'
import { UUID } from '../../models/uuid'
import { TransactionResponse, TransactionState } from '../../models/transaction'
import { TokenType } from '../../models/tokenType'
import { observeTokenId } from '../../lib/services/blockchainWatcher'
import { runProcess } from '../../lib/services/dscpApi'
import { match2Propose } from '../../lib/payload'
import { DemandSubtype } from '../../models/demand'

@Route('match2')
@Tags('match2')
@Security('bearerAuth')
export class Match2Controller extends Controller {
  log: Logger
  db: Database

  constructor() {
    super()
    this.log = logger.child({ controller: '/match2' })
    this.db = new Database()
  }

  /**
   * A Member proposes a new match2 for an order and a capacity by referencing each demand.
   * @summary Propose a new match2
   */
  @Post()
  @Response<BadRequest>(400, 'Request was invalid')
  @Response<ValidateError>(422, 'Validation Failed')
  @SuccessResponse('201')
  public async proposeMatch2(
    @Body() { demandA: demandAId, demandB: demandBId }: Match2Request
  ): Promise<Match2Response> {
    const [demandA] = await this.db.getDemand(demandAId)
    if (!demandA) {
      throw new BadRequest('Demand A not found')
    }

    if (demandA.subtype !== DemandSubtype.order) {
      throw new BadRequest(`DemandA must be ${DemandSubtype.order}`)
    }

    const [demandB] = await this.db.getDemand(demandBId)
    if (!demandB) {
      throw new BadRequest('Demand B not found')
    }

    if (demandB.subtype !== DemandSubtype.capacity) {
      throw new BadRequest(`DemandB must be ${DemandSubtype.capacity}`)
    }

    const selfAddress = await getMemberBySelf()

    const [match2] = await this.db.insertMatch2({
      optimiser: selfAddress,
      member_a: demandA.owner,
      member_b: demandB.owner,
      state: Match2State.proposed,
      demand_a_id: demandAId,
      demand_b_id: demandBId,
    })

    return responseWithAliases(match2)
  }

  /**
   * Returns the details of all match2s.
   * @summary List all match2s
   */
  @Get('/')
  public async getAll(): Promise<Match2Response[]> {
    const match2s = await this.db.getMatch2s()
    const result = await Promise.all(match2s.map(async (match2: Match2Response) => responseWithAliases(match2)))
    return result
  }

  /**
   * @summary Get a match2 by ID
   * @param match2Id The match2's identifier
   */
  @Response<ValidateError>(400, 'Validation Failed')
  @Response<NotFound>(404, 'Item not found')
  @Get('{match2Id}')
  public async getMatch2(@Path() match2Id: UUID): Promise<Match2Response> {
    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    return responseWithAliases(match2)
  }

  /**
   * An optimiser creates the match2 {match2Id} on-chain. The match2 is now viewable to other members.
   * @summary Create a new match2 on-chain
   * @param match2Id The match2's identifier
   */
  @Post('{match2Id}/proposal')
  @Response<NotFound>(404, 'Item not found')
  @SuccessResponse('201')
  public async createMatch2OnChain(@Path() match2Id: UUID): Promise<TransactionResponse> {
    const [match2] = await this.db.getMatch2(match2Id)
    if (!match2) throw new NotFound('match2')

    const [{ latestTokenId: demandAId }] = await this.db.getDemandLatestTokenId(match2.demandA)
    if (!demandAId) {
      throw new BadRequest('Demand A must be on chain')
    }

    const [{ latestTokenId: demandBId }] = await this.db.getDemandLatestTokenId(match2.demandB)
    if (!demandBId) {
      throw new BadRequest('Demand B must be on chain')
    }

    const [transaction] = await this.db.insertTransaction({
      token_type: TokenType.MATCH2,
      local_id: match2Id,
      state: TransactionState.submitted,
    })

    // temp - until there is a blockchain watcher, need to await runProcess to know token IDs
    const [tokenId] = await runProcess(match2Propose(match2, demandAId, demandBId))
    await observeTokenId(this.db, TokenType.MATCH2, transaction.id, tokenId, true)
    return {
      id: transaction.id,
      submittedAt: new Date(transaction.created_at),
      state: transaction.state,
    }
  }
}

const responseWithAliases = async (match2: Match2Response): Promise<Match2Response> => {
  const [{ alias: optimiser }, { alias: memberA }, { alias: memberB }] = await Promise.all([
    getMemberByAddress(match2.optimiser),
    getMemberByAddress(match2.memberA),
    getMemberByAddress(match2.memberB),
  ])

  return {
    id: match2.id,
    state: match2.state,
    optimiser,
    memberA,
    memberB,
    demandA: match2.demandA,
    demandB: match2.demandB,
  }
}
