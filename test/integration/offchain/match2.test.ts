import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server.js'
import { post, get } from '../../helper/routeHelper.js'
import {
  cleanup,
  match2Seed,
  seededDemandBId,
  seededDemandAId,
  nonExistentId,
  seededMatch2Id,
  seededDemandAMissingTokenId,
  seededDemandBMissingTokenId,
  seededProposalTransactionId,
  exampleDate,
  seededDemandBAlreadyAllocated,
  seededDemandAAlreadyAllocated,
  seededMatch2WithAllocatedDemands,
  seededMatch2AcceptedA,
  seededMatch2AcceptedFinal,
  seededMatch2NotAcceptableB,
  seededMatch2NotAcceptableA,
  seededMatch2NotAcceptableBoth,
  seededAcceptTransactionId,
  seededDemandAWithTokenId,
  seededDemandBWithTokenId,
  seededRejectionTransactionId,
  seededMatch2NotInRoles,
  seededMatch2CancellationId,
  seededMatch2CancellationId2,
  seededMatch2Rematch2Accept,
  seededMatch2Rematch2AcceptFinal,
  seededRematch2DemndBAllocated,
  seededRematch2DemndACreated,
} from '../../seeds/offchainSeeds/offchain.match2.seed.js'

import {
  MockDispatcherContext,
  parametersAttachmentId,
  proxyAlias,
  withAttachmentMock,
  withDispatcherMock,
  withIdentitySelfMock,
} from '../../helper/mock.js'
import { assertIsoDate, assertUUID } from '../../helper/assertions.js'

describe('match2', () => {
  let app: Express
  const context: MockDispatcherContext = {} as MockDispatcherContext

  before(async function () {
    app = await createHttpServer()
  })

  withDispatcherMock(context)
  withIdentitySelfMock(context)
  withAttachmentMock(context)

  beforeEach(async function () {
    await match2Seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('happy path', () => {
    it('should create a match2', async () => {
      const response = await post(app, '/v1/match2', {
        demandA: seededDemandAWithTokenId,
        demandB: seededDemandBWithTokenId,
      })
      expect(response.status).to.equal(201)

      const { id: responseId, createdAt, updatedAt, ...responseRest } = response.body
      assertUUID(responseId)
      assertIsoDate(createdAt)
      assertIsoDate(updatedAt)
      expect(responseRest).to.deep.contain({
        state: 'pending',
        optimiser: proxyAlias,
        memberA: proxyAlias,
        memberB: proxyAlias,
        demandA: seededDemandAWithTokenId,
        demandB: seededDemandBWithTokenId,
      })
    })

    it('should create a match2 - scope', async () => {
      const { status } = await post(
        app,
        '/v1/match2',
        {
          demandA: seededDemandAWithTokenId,
          demandB: seededDemandBWithTokenId,
        },
        {},
        'match2:prepare'
      )
      expect(status).to.equal(201)
    })

    it('should get a match2', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.contain({
        id: seededMatch2Id,
        state: 'pending',
        optimiser: proxyAlias,
        memberA: proxyAlias,
        memberB: proxyAlias,
        demandA: seededDemandAId,
        demandB: seededDemandBId,
        createdAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('should get a match2 - scope', async () => {
      const { status } = await get(app, `/v1/match2/${seededMatch2Id}`, {}, 'match2:read')
      expect(status).to.equal(200)
    })

    it('should get all match2s', async () => {
      const { status, body } = await get(app, `/v1/match2`)
      expect(status).to.equal(200)
      expect(body).to.be.an('array')
      expect(body.find(({ id }: { id: string }) => id === seededMatch2Id)).to.deep.contain({
        id: seededMatch2Id,
        state: 'pending',
        optimiser: proxyAlias,
        memberA: proxyAlias,
        memberB: proxyAlias,
        demandA: seededDemandAId,
        demandB: seededDemandBId,
        createdAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('should get all match2s - scope', async () => {
      const { status } = await get(app, `/v1/match2`, {}, 'match2:read')
      expect(status).to.equal(200)
    })

    it('should filter based on updated date', async () => {
      const { status, body } = await get(app, `/v1/match2?updated_since=2023-01-01T00:00:00.000Z`)
      expect(status).to.equal(200)
      expect(body).to.deep.equal([])
    })

    it('it should get all proposal transactions - 200', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/proposal`)
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
      expect(response.body[0]).to.deep.equal({
        id: seededProposalTransactionId,
        transactionType: 'proposal',
        apiType: 'match2',
        localId: seededMatch2Id,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('it should get all proposal transactions - scope', async () => {
      const { status } = await get(app, `/v1/match2/${seededMatch2Id}/proposal`, {}, 'match2:read')
      expect(status).to.equal(200)
    })

    it('should filter accept transactions based on updated date', async () => {
      const { status, body } = await get(
        app,
        `/v1/match2/${seededMatch2Id}/proposal?updated_since=2023-01-01T00:00:00.000Z`
      )
      expect(status).to.equal(200)
      expect(body).to.deep.equal([])
    })

    it('it should get an accept transaction', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/accept/${seededAcceptTransactionId}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededAcceptTransactionId,
        apiType: 'match2',
        transactionType: 'accept',
        localId: seededMatch2Id,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('it should get an accept transaction - scope', async () => {
      const { status } = await get(
        app,
        `/v1/match2/${seededMatch2Id}/accept/${seededAcceptTransactionId}`,
        {},
        'match2:read'
      )
      expect(status).to.equal(200)
    })

    it('it should get all accept transactions', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/accept`)
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
      expect(response.body[0]).to.deep.equal({
        id: seededAcceptTransactionId,
        apiType: 'match2',
        transactionType: 'accept',
        localId: seededMatch2Id,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('it should get all accept transactions - scope', async () => {
      const { status } = await get(app, `/v1/match2/${seededMatch2Id}/accept`, {}, 'match2:read')
      expect(status).to.equal(200)
    })

    it('should filter accept transactions based on updated date', async () => {
      const { status, body } = await get(
        app,
        `/v1/match2/${seededMatch2Id}/accept?updated_since=2023-01-01T00:00:00.000Z`
      )
      expect(status).to.equal(200)
      expect(body).to.deep.equal([])
    })

    it('it should get a rejection transaction', async () => {
      const { status, body } = await get(app, `/v1/match2/${seededMatch2Id}/rejection/${seededRejectionTransactionId}`)
      expect(status).to.equal(200)
      expect(body).to.deep.equal({
        id: seededRejectionTransactionId,
        apiType: 'match2',
        transactionType: 'rejection',
        localId: seededMatch2Id,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('it should get a rejection transaction - scope', async () => {
      const { status } = await get(
        app,
        `/v1/match2/${seededMatch2Id}/rejection/${seededRejectionTransactionId}`,
        {},
        'match2:read'
      )
      expect(status).to.equal(200)
    })

    it('it should get all rejection transactions', async () => {
      const { status, body } = await get(app, `/v1/match2/${seededMatch2Id}/rejection`)
      expect(status).to.equal(200)
      expect(body).to.be.an('array')
      expect(body.find(({ id }: { id: string }) => id === seededRejectionTransactionId)).to.deep.equal({
        id: seededRejectionTransactionId,
        apiType: 'match2',
        transactionType: 'rejection',
        localId: seededMatch2Id,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('it should get all rejection transactions - scope', async () => {
      const { status } = await get(app, `/v1/match2/${seededMatch2Id}/rejection`, {}, 'match2:read')
      expect(status).to.equal(200)
    })

    it('should filter rejection transactions based on updated date', async () => {
      const { status, body } = await get(
        app,
        `/v1/match2/${seededMatch2Id}/rejection?updated_since=2023-01-01T00:00:00.000Z`
      )
      expect(status).to.equal(200)
      expect(body).to.deep.equal([])
    })

    it('cancels an existing match2 that is in final state', async () => {
      const { status, body } = await post(app, `/v1/match2/${seededMatch2AcceptedFinal}/cancellation`, {
        attachmentId: parametersAttachmentId,
      })

      expect(status).to.equal(200)
      expect(body).to.deep.contain({
        state: 'submitted',
        localId: '85a50fd9-f20f-4a61-a7e4-3ad49b7c3f21',
        apiType: 'match2',
        transactionType: 'cancellation',
      })
    })

    it('gets all cancellation transactions for a specific match2', async () => {
      const { status, body } = await get(app, `/v1/match2/${seededMatch2Id}/cancellation`)

      expect(status).to.equal(200)
      expect(body).to.be.an('array')
      expect(body.find(({ id }: { id: string }) => id === seededMatch2CancellationId)).to.deep.equal({
        id: seededMatch2CancellationId,
        apiType: 'match2',
        transactionType: 'cancellation',
        localId: seededMatch2Id,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
      expect(body.find(({ id }: { id: string }) => id === seededMatch2CancellationId2)).to.deep.equal({
        id: seededMatch2CancellationId2,
        apiType: 'match2',
        transactionType: 'cancellation',
        localId: seededMatch2Id,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('gets all cancellation transactions for a specific match2 - scope', async () => {
      const { status } = await get(app, `/v1/match2/${seededMatch2Id}/cancellation`, {}, 'match2:read')
      expect(status).to.equal(200)
    })

    it('accepts a remtch2 when it is in acceptedA state', async () => {
      const { status, body } = await post(app, `/v1/match2/${seededMatch2Rematch2Accept}/accept`, {})

      expect(status).to.equal(201)
      expect(body).to.deep.contain({
        apiType: 'match2',
        transactionType: 'accept',
        localId: seededMatch2Rematch2Accept,
        state: 'submitted',
      })
    })

    it('accepts a remtch2 when it is in acceptedA state - scope', async () => {
      const { status } = await post(app, `/v1/match2/${seededMatch2Rematch2Accept}/accept`, {}, {}, 'match2:accept')
      expect(status).to.equal(201)
    })

    it('runs rematch2_acceptFinal flow', async () => {
      const { status, body } = await post(app, `/v1/match2/${seededMatch2Rematch2AcceptFinal}/accept`, {})

      expect(status).to.equal(201)
      expect(body).to.deep.contain({
        apiType: 'match2',
        transactionType: 'accept',
        localId: seededMatch2Rematch2AcceptFinal,
        state: 'submitted',
      })
    })
  })

  describe('sad path', () => {
    it('if updatedSince is not a date returns 422', async () => {
      const { status, body } = await get(app, `/v1/match2?updated_since=foo`)
      expect(status).to.equal(422)
      expect(body).to.contain({
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })

    it('unauthenticated create match2', async () => {
      const response = await post(
        app,
        '/v1/match2',
        {
          demandA: seededDemandAWithTokenId,
          demandB: seededDemandBWithTokenId,
        },
        {
          authorization: 'bearer invalid',
        }
      )
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('INVALID_TOKEN')
    })

    it('missing scope create match2', async () => {
      const response = await post(
        app,
        '/v1/match2',
        {
          demandA: seededDemandAWithTokenId,
          demandB: seededDemandBWithTokenId,
        },
        {},
        ''
      )
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('non-existent demandA - 400', async () => {
      const response = await post(app, '/v1/match2', { demandA: nonExistentId, demandB: seededDemandBId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA not found')
    })

    it('non-existent demandB - 400', async () => {
      const response = await post(app, '/v1/match2', { demandA: seededDemandAWithTokenId, demandB: nonExistentId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandB not found')
    })

    it('demandA not an demandA - 400', async () => {
      const response = await post(app, '/v1/match2', { demandA: seededDemandBId, demandB: seededDemandBId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('subtype must be demand_a, is: demand_b')
    })

    it('demandB not a demandB - 400', async () => {
      const response = await post(app, '/v1/match2', { demandA: seededDemandAWithTokenId, demandB: seededDemandAId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('subtype must be demand_b, is: demand_a')
    })

    it('demandA allocated - 400', async () => {
      const response = await post(app, '/v1/match2', {
        demandA: seededDemandAAlreadyAllocated,
        demandB: seededDemandBId,
      })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('state must be created, is: allocated')
    })

    it('demandB allocated - 400', async () => {
      const response = await post(app, '/v1/match2', {
        demandA: seededDemandAWithTokenId,
        demandB: seededDemandBAlreadyAllocated,
      })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('state must be created, is: allocated')
    })

    it('invalid demand uuid - 422', async () => {
      const response = await post(app, '/v1/match2', { demandA: 'invalid', demandB: seededDemandBId })
      expect(response.status).to.equal(422)
      expect(response.body.message).to.equal('Validation failed')
    })

    it('non-existent match2 id - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('unauthenticated get match2 - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}`, { authorization: 'bearer invalid' })
      expect(response.status).to.equal(401)
    })

    it('missing scope get match2 - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}`, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('incorrect state when creating on-chain - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2AcceptedA}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`state must be pending, is: acceptedA`)
    })

    it('demandA missing token ID - 400', async () => {
      const createMatch2 = await post(app, '/v1/match2', {
        demandA: seededDemandAMissingTokenId,
        demandB: seededDemandBWithTokenId,
      })
      expect(createMatch2.status).to.equal(400)
    })

    it('demandB missing token ID - 400', async () => {
      const createMatch2 = await post(app, '/v1/match2', {
        demandA: seededDemandAWithTokenId,
        demandB: seededDemandBMissingTokenId,
      })
      expect(createMatch2.status).to.equal(400)
    })

    it('demand allocated - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2WithAllocatedDemands}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('state must be created, is: allocated')
    })

    it('non-existent proposal ID - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/proposal/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('using cancel id - 404', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2AcceptedA}/proposal/${seededMatch2CancellationId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent match2 when getting a proposal - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/proposal/${seededProposalTransactionId}`)
      expect(response.status).to.equal(404)
    })

    it('unauthenticated get match2 proposal - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/proposal/${seededProposalTransactionId}`, {
        authorization: 'bearer invalid',
      })
      expect(response.status).to.equal(401)
    })

    it('missing scope get match2 proposal - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/proposal/${seededProposalTransactionId}`, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('non-existent match2 when listing proposals - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/proposal`)
      expect(response.status).to.equal(404)
    })

    it('unauthenticated list match2 proposals - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/proposal`, {
        authorization: 'bearer invalid',
      })
      expect(response.status).to.equal(401)
    })

    it('missing scope list match2 proposals - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/proposal`, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('list proposals with invalid updatedSince - 422', async () => {
      const { status, body } = await get(app, `/v1/match2/${seededMatch2AcceptedA}/proposal?updated_since=foo`)
      expect(status).to.equal(422)
      expect(body).to.contain({
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })

    it('unauthenticated accept match2 - 401', async () => {
      const { status } = await post(
        app,
        `/v1/match2/${seededMatch2Id}/accept`,
        {},
        {
          authorization: 'bearer invalid',
        }
      )

      expect(status).to.equal(401)
    })

    it('missing scope accept match2 - 401', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2Id}/accept`, {}, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('match2 at acceptA and DemandB not owned - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2NotAcceptableA}/accept`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`You do not own an acceptable demand`)
    })

    it('match2 at acceptB and DemandA not owned - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2NotAcceptableB}/accept`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`You do not own an acceptable demand`)
    })

    it('neither demand owned - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2NotAcceptableBoth}/accept`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`You do not own an acceptable demand`)
    })

    it('match2 already acceptedFinal when accepting - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2AcceptedFinal}/accept`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`state should not be acceptedFinal`)
    })

    it('non-existent match2 id when accepting - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/accept`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('non-existent match2 when listing accepts - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/accept`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('unauthenticated list match2 proposals - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2AcceptedA}/accept`, {
        authorization: 'bearer invalid',
      })
      expect(response.status).to.equal(401)
    })

    it('missing scope list match2 proposals - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2AcceptedA}/accept`, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('list accepts with invalid updatedSince - 422', async () => {
      const { status, body } = await get(app, `/v1/match2/${seededMatch2AcceptedA}/accept?updated_since=foo`)
      expect(status).to.equal(422)
      expect(body).to.contain({
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })

    it('non-existent match2 when getting an accept - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/accept/${seededAcceptTransactionId}`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('using cancel id - 404', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2AcceptedA}/accept/${seededMatch2CancellationId}`)
      expect(response.status).to.equal(404)
    })

    it('unauthenticated get match2 accept - 401', async () => {
      const { status } = await get(app, `/v1/match2/${seededMatch2AcceptedA}/accept/${seededAcceptTransactionId}`, {
        authorization: 'bearer invalid',
      })
      expect(status).to.equal(401)
    })

    it('missing scope get match2 accept - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2AcceptedA}/accept/${seededAcceptTransactionId}`, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('non-existent transaction when getting an accept - 404', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/accept/${nonExistentId}`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('accept not found')
    })

    it('unauthenticated match2 reject - 401', async () => {
      const { status } = await post(
        app,
        `/v1/match2/${seededMatch2AcceptedA}/rejection`,
        {},
        {
          authorization: 'bearer invalid',
        }
      )
      expect(status).to.equal(401)
    })

    it('missing scope match2 reject - 401', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2AcceptedA}/rejection`, {}, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('rejection of match2 at incorrect state - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2AcceptedFinal}/rejection`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`Match2 state must be one of: proposed, acceptedA, acceptedB`)
    })

    it('rejection of match2 submitter not in roles - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2NotInRoles}/rejection`, {})
      // Not found because match2 submitter can only see their matches they are members of
      expect(response.status).to.equal(404)
      expect(response.body).to.equal(`match2 not found`)
    })

    it('unauthenticated list match2 rejections - 401', async () => {
      const { status } = await get(app, `/v1/match2/${seededMatch2AcceptedA}/rejection`, {
        authorization: 'bearer invalid',
      })
      expect(status).to.equal(401)
    })

    it('missing scope list match2 rejections - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2AcceptedA}/rejection`, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('non-existent match2 id when rejection - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/rejection`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('non-existent match2 when listing rejections - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/rejection`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('list rejections with invalid updatedSince - 422', async () => {
      const { status, body } = await get(app, `/v1/match2/${seededMatch2AcceptedA}/rejection?updated_since=foo`)
      expect(status).to.equal(422)
      expect(body).to.contain({
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })

    it('unauthenticated get match2 rejection - 401', async () => {
      const { status } = await get(
        app,
        `/v1/match2/${seededMatch2AcceptedA}/rejection/${seededRejectionTransactionId}`,
        {
          authorization: 'bearer invalid',
        }
      )
      expect(status).to.equal(401)
    })

    it('missing scope get match2 rejection - 401', async () => {
      const response = await get(
        app,
        `/v1/match2/${seededMatch2AcceptedA}/rejection/${seededRejectionTransactionId}`,
        {},
        ''
      )
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('non-existent match2 when getting a rejection - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/rejection/${seededRejectionTransactionId}`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('non-existent transaction when getting a rejection - 404', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/rejection/${nonExistentId}`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('rejection not found')
    })

    it('unauthenticated match2 cancel - 401', async () => {
      const { status } = await post(
        app,
        `/v1/match2/${seededMatch2AcceptedFinal}/cancellation`,
        {},
        {
          authorization: 'bearer invalid',
        }
      )
      expect(status).to.equal(401)
    })

    it('missing scope match2 cancel - 401', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2AcceptedFinal}/cancellation`, {}, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('non-existent match2 when cancelling - 404', async () => {
      const response = await post(app, `/v1/match2/a789ad47-91c3-446e-90f9-a7c9b233ea11/cancellation`, {
        attachmentId: parametersAttachmentId,
      })
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('with invalid role - 400', async () => {
      const response = await post(app, `/v1/match2/619fb8ca-4dd9-4843-8c7a-9d9c9474784e/cancellation`, {
        attachmentId: parametersAttachmentId,
      })
      // Not found because only members and admin can see matches
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('with invalid state - 400', async () => {
      const response = await post(app, `/v1/match2/f960e4a1-6182-4dd3-8ac2-6f3fad995551/cancellation`, {
        attachmentId: parametersAttachmentId,
      })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('Match2 state must be acceptedFinal')
    })

    it('unauthenticated get match2 cancellation - 401', async () => {
      const { status } = await get(
        app,
        `/v1/match2/${seededMatch2AcceptedFinal}/cancellation/${seededMatch2CancellationId}`,
        {
          authorization: 'bearer invalid',
        }
      )
      expect(status).to.equal(401)
    })

    it('missing scope get match2 cancellation - 401', async () => {
      const response = await get(
        app,
        `/v1/match2/${seededMatch2AcceptedFinal}/cancellation/${seededMatch2CancellationId}`,
        {},
        ''
      )
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('non-existent match2 when getting a cancellation - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/cancellation/${seededMatch2CancellationId}`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('non-existent transaction when getting a cancellation - 404', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/cancellation/${nonExistentId}`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('cancellation not found')
    })

    it('unauthenticated list match2 cancellations - 401', async () => {
      const { status } = await get(app, `/v1/match2/${seededMatch2AcceptedFinal}/cancellation`, {
        authorization: 'bearer invalid',
      })
      expect(status).to.equal(401)
    })

    it('missing scope list match2 cancellations - 401', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2AcceptedFinal}/cancellation`, {}, '')
      expect(response.status).to.equal(401)
      expect(response.body.message).to.contain('MISSING_SCOPES')
    })

    it('non-existent match2 when listing cancellations - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/cancellation`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    describe('rematch2', () => {
      it('with demand_b allocated - 400', async () => {
        const { status, body } = await post(app, `/v1/match2/${seededRematch2DemndBAllocated}/accept`, {})

        expect(status).to.equal(400)
        expect(body).to.equal('state must be created, is: allocated')
      })

      it('with demand_a created - 400', async () => {
        const { status, body } = await post(app, `/v1/match2/${seededRematch2DemndACreated}/accept`, {})

        expect(status).to.equal(400)
        expect(body).to.equal('state must be allocated, is: created')
      })
    })
  })
})
