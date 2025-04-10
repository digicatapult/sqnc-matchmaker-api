import { Controller, Route, Response, Security, Hidden, Post, Body } from 'tsoa'
import type { Logger } from 'pino'

import { LoggerToken } from '../../../lib/logger.js'
import Database from '../../../lib/db/index.js'
import { inject, injectable } from 'tsyringe'
import { AuthorizationRequest, AuthorizationResponse } from '../../../models/authorization.js'
import { AddressResolver } from '../../../utils/determineSelfAddress.js'
import { UUID } from '../../../models/strings.js'
import { Unauthorized } from '../../../lib/error-handler/index.js'
import Identity, { type IdentityResponse } from '../../../lib/services/identity.js'

const success = {
  result: {
    allowed: true as const,
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
    if (await this.reduceLocalIdsForAuthz(externalIdentity, ourMatch2sWithComments, this.authorizeForOurMatch2)) {
      return success
    }

    // case 5.
    const otherMatch2sWithComments = commentDemands.filter(({ owner }) => owner !== self.address)
    if (await this.reduceLocalIdsForAuthz(externalIdentity, otherMatch2sWithComments, this.authorizeForOtherMatch2)) {
      return success
    }

    // :(
    throw new Unauthorized()
  }

  private async reduceLocalIdsForAuthz(
    identity: IdentityResponse,
    rows: { id: UUID }[],
    mapper: (id: UUID, identity: IdentityResponse) => Promise<boolean>
  ) {
    return new Promise((resolve) => {
      let resolved = false
      Promise.all(
        rows.map(({ id }) => {
          mapper(id, identity).then((check) => {
            if (check) {
              resolved = true
              resolve(true)
            }
          })
        })
      ).then(() => {
        if (!resolved) {
          resolve(false)
        }
      })
    })
  }

  private async authorizeForOurDemand(id: UUID, address: IdentityResponse): Promise<boolean> {
    // share with our OPTIMISERs, and any owner of a demand matched with our demand
    return false
  }

  private async authorizeForOtherDemand(id: UUID, address: IdentityResponse): Promise<boolean> {
    // share with the owner of the demand, the owner of any match with that demand and the owner of any demand matched with that demand
    return false
  }

  private async authorizeForOurMatch2(id: UUID, address: IdentityResponse): Promise<boolean> {
    // share with the owners of the demands in the match
    return false
  }

  private async authorizeForOtherMatch2(id: UUID, address: IdentityResponse): Promise<boolean> {
    // share with the owner of the match or the owner of either demand referenced in the match
    return false
  }
}
