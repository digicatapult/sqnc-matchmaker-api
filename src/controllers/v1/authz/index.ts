import { Controller, Route, Response, Security, Hidden, Post, Body } from 'tsoa'
import type { Logger } from 'pino'

import { LoggerToken } from '../../../lib/logger.js'
import Database from '../../../lib/db/index.js'
import { inject, injectable } from 'tsyringe'
import type { AuthorizationRequest, AuthorizationResponse } from '../../../models/authorization.js'
import { AddressResolver } from '../../../utils/determineSelfAddress.js'
import { Unauthorized } from '../../../lib/error-handler/index.js'
import Identity from '../../../lib/services/identity.js'
import { type IdentityResponse } from '../../../lib/services/identity.js'
import type { DemandRow, Match2Row, Where } from '../../../lib/db/types.js'

const success = {
  result: {
    allow: true as const,
  },
}

@Route('v1/authz')
@Security('internal')
@Hidden()
@injectable()
export class AuthorizationController extends Controller {
  constructor(
    private db: Database,
    private identity: Identity,
    private addressResolver: AddressResolver,
    @inject(LoggerToken) private logger: Logger
  ) {
    super()
  }

  @Post('/')
  @Response<AuthorizationResponse>(200)
  public async authorize(@Body() authorizationRequest: AuthorizationRequest): Promise<AuthorizationResponse> {
    // the following attachments are created by us and need to be considered
    // 1. parameters on demands we own
    // 2. comments by us on demands we own
    // 3. comments by us on demands we do not own
    // 4. comments on matches we own (we are the optimiser)
    // 5. comments on matches we do not own
    this.logger.debug(
      'Received request to access attachment %s by %s',
      authorizationRequest.input.resourceId,
      authorizationRequest.input.accountAddress
    )

    const self = await this.addressResolver.determineSelfAddress()
    const attachmentId = authorizationRequest.input.resourceId
    const externalIdentity = await this.identity.getMemberByAddress(authorizationRequest.input.accountAddress)

    // case 1.
    const ourDemands = await this.db.get('demand', { parameters_attachment_id: attachmentId, owner: self.address })
    if (await this.reduceLocalIdsForAuthz(externalIdentity, ourDemands, this.authorizeForOurDemand)) {
      return success
    }

    const ourDemandComments = await this.db.get('demand_comment', { attachment_id: attachmentId, owner: self.address })
    const commentDemandSet = [...new Set(ourDemandComments.map(({ demand }) => demand))]
    const commentDemands = await this.db.get('demand', [['id', 'IN', commentDemandSet]])

    // case 2.
    const ourDemandsWithComments = commentDemands.filter(({ owner }) => owner === self.address)
    if (await this.reduceLocalIdsForAuthz(externalIdentity, ourDemandsWithComments, this.authorizeForOurDemand)) {
      return success
    }

    // case 3.
    const otherDemandsWithComments = commentDemands.filter(({ owner }) => owner !== self.address)
    if (await this.reduceLocalIdsForAuthz(externalIdentity, otherDemandsWithComments, this.authorizeForOtherDemand)) {
      return success
    }

    const ourMatch2Comments = await this.db.get('match2_comment', { attachment_id: attachmentId, owner: self.address })
    const commentMatch2Set = [...new Set(ourMatch2Comments.map(({ match2 }) => match2))]
    const commentMatch2s = await this.db.get('match2', [['id', 'IN', commentMatch2Set]])

    // case 4.
    const ourMatch2sWithComments = commentMatch2s.filter(({ optimiser }) => optimiser === self.address)
    if (await this.reduceLocalIdsForAuthz(externalIdentity, ourMatch2sWithComments, this.authorizeForMatch2)) {
      return success
    }

    // case 5.
    const otherMatch2sWithComments = commentMatch2s.filter(({ optimiser }) => optimiser !== self.address)
    if (await this.reduceLocalIdsForAuthz(externalIdentity, otherMatch2sWithComments, this.authorizeForMatch2)) {
      return success
    }

    // :(
    throw new Unauthorized()
  }

  private async reduceLocalIdsForAuthz<T>(
    identity: IdentityResponse,
    rows: T[],
    mapper: (row: T, identity: IdentityResponse) => Promise<boolean>
  ) {
    for (const row of rows) {
      if (await mapper(row, identity)) {
        return true
      }
    }
    return false
  }

  private authorizeForOurDemand = async (demand: DemandRow, extIdentity: IdentityResponse): Promise<boolean> => {
    // share with our OPTIMISERs, and any owner of a demand matched with our demand

    if (extIdentity.role === 'Optimiser') {
      return true
    }

    const where: Where<'match2'> =
      demand.subtype === 'demand_a'
        ? { demand_a_id: demand.id, member_b: extIdentity.address }
        : { demand_b_id: demand.id, member_a: extIdentity.address }

    const matches = await this.db.get('match2', where)
    if (matches.length > 0) {
      return true
    }

    return false
  }

  private authorizeForOtherDemand = async (demand: DemandRow, extIdentity: IdentityResponse): Promise<boolean> => {
    // share with the owner of the demand, the optimiser for any match with that demand and the owner of any demand matched with that demand

    if (demand.owner === extIdentity.address) {
      return true
    }

    const where: Where<'match2'> =
      demand.subtype === 'demand_a' ? { demand_a_id: demand.id } : { demand_b_id: demand.id }

    const matches = await this.db.get('match2', where)
    const identities = new Set(matches.map((m) => [m.member_a, m.member_b, m.optimiser]).flat())
    if (identities.has(extIdentity.address)) {
      return true
    }

    return false
  }

  private authorizeForMatch2 = async (match: Match2Row, extIdentity: IdentityResponse): Promise<boolean> => {
    // share with the owner of the match or the owner of either demand referenced in the match

    const ids = new Set([match.member_a, match.member_b, match.optimiser])
    if (ids.has(extIdentity.address)) {
      return true
    }

    return false
  }
}
