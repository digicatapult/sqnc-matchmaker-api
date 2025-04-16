import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server.js'
import { postInternal } from '../../helper/routeHelper.js'
import { cleanup } from '../../seeds/offchainSeeds/offchain.match2.seed.js'

import {
  MockDispatcherContext,
  withIdentitySelfMock,
  withDispatcherMock,
  notSelfAddress,
  optimiserAddress,
  selfAddress,
} from '../../helper/mock.js'
import { AuthorizationRequest } from '../../../src/models/authorization.js'
import {
  authzSeed,
  demandACommentAttachmentId,
  demandANotOwnedCommentAttachmentId,
  demandAOwnedByNotSelfAttachmentId,
  demandAParametersAttachmentId,
  demandBCommentAttachmentId,
  demandBNotOwnedCommentAttachmentId,
  demandBOwnedByNotSelfAttachmentId,
  demandBParametersAttachmentId,
  match2CommentAttachmentId,
  match2NotOwnedCommentAttachmentId,
  notOptimiserAddress,
} from '../../seeds/offchainSeeds/authz.seed.js'

describe('authz', () => {
  let app: Express
  const context: MockDispatcherContext = {} as MockDispatcherContext

  before(async function () {
    app = await createHttpServer()
  })

  withDispatcherMock(context)
  withIdentitySelfMock(context)

  beforeEach(async function () {
    await authzSeed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('happy path', () => {
    describe('parameters on demands we own', () => {
      it('should authorize external access to parameters on demand A we own - external owns matched demand B', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandAParametersAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to parameters on demand B we own - external owns matched demand A', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandBParametersAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to parameters on demand A we own - external is optimiser', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandAParametersAttachmentId,
            accountAddress: optimiserAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to parameters on demand B we own - external is optimiser', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandBParametersAttachmentId,
            accountAddress: optimiserAddress,
          },
        }
        await assertAuthorized(app, request)
      })
    })

    describe('comments on demands we own', () => {
      it('should authorize external access to comment on demand A we own - external owns matched demand B', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandACommentAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on demand B we own - external owns matched demand A', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandBCommentAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on demand A we own - external is optimiser', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandACommentAttachmentId,
            accountAddress: optimiserAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on demand B we own - external is optimiser', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandBCommentAttachmentId,
            accountAddress: optimiserAddress,
          },
        }
        await assertAuthorized(app, request)
      })
    })

    describe('comments on demands we do not own', () => {
      it('should authorize external access to comment on demand A we do not own - external owns commented demand A', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandAOwnedByNotSelfAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on demand B we do not own - external owns commented demand B', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandBOwnedByNotSelfAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on demand A we do not own - optimiser owns match with demand A', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandAOwnedByNotSelfAttachmentId,
            accountAddress: optimiserAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on demand B we do not own - optimiser owns match with demand B', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandBOwnedByNotSelfAttachmentId,
            accountAddress: optimiserAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on demand A we do not own - external owns demand B matched with commented demand A', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandANotOwnedCommentAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on demand B we do not own - external owns demand A matched with commented demand B', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: demandBNotOwnedCommentAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })
    })

    describe('comments on match2s we own', () => {
      it('should authorize external access to comment on match2 we own - external owns demand A in match', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: match2CommentAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on match2 we own - third party owns demand B in match', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: match2CommentAttachmentId,
            accountAddress: notOptimiserAddress,
          },
        }
        await assertAuthorized(app, request)
      })
    })

    describe('comments on match2s we do not own', () => {
      it('should authorize external access to comment on match2 we do not own - external owns demand A in match', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: match2NotOwnedCommentAttachmentId,
            accountAddress: notSelfAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on match2 we do not own - third party owns demand B in match', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: match2NotOwnedCommentAttachmentId,
            accountAddress: notOptimiserAddress,
          },
        }
        await assertAuthorized(app, request)
      })

      it('should authorize external access to comment on match2 we do not own - external owns match', async () => {
        const request: AuthorizationRequest = {
          input: {
            resourceType: 'attachment',
            resourceId: match2NotOwnedCommentAttachmentId,
            accountAddress: optimiserAddress,
          },
        }
        await assertAuthorized(app, request)
      })
    })
  })

  describe('sad path', () => {
    it('401 by default', async () => {
      const request: AuthorizationRequest = {
        input: {
          resourceType: 'attachment',
          resourceId: demandAParametersAttachmentId,
          accountAddress: selfAddress,
        },
      }
      const response = await postInternal(app, '/v1/authz', request)
      expect(response.status).to.equal(401)
    })
  })
})

const assertAuthorized = async (app: Express, request: AuthorizationRequest) => {
  const response = await postInternal(app, '/v1/authz', request)
  expect(response.status).to.equal(200)
  expect(response.body.result.allowed).to.equal(true)
}
