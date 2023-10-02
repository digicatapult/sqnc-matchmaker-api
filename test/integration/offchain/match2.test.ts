import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server'
import { post, get } from '../../helper/routeHelper'
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
} from '../../seeds/offchainSeeds/offchain.match2.seed'

import { selfAlias, withIdentitySelfMock } from '../../helper/mock'
import { assertIsoDate, assertUUID } from '../../helper/assertions'

describe('match2', () => {
  let app: Express

  before(async function () {
    app = await createHttpServer()
  })

  withIdentitySelfMock()

  beforeEach(async function () {
    await match2Seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('happy path', () => {
    it('should create a match2', async () => {
      //both demands were pending - now using the ones with tokenID and in created state
      const response = await post(app, '/v1/match2', {
        demandA: seededDemandAWithTokenId,
        demandB: seededDemandBWithTokenId,
      })
      expect(response.status).to.equal(201)

      const { id: responseId, createdAt, updatedAt, ...responseRest } = response.body
      assertUUID(responseId)
      assertIsoDate(createdAt)
      assertIsoDate(updatedAt)
      expect(responseRest).to.deep.equal({
        state: 'pending',
        optimiser: selfAlias,
        memberA: selfAlias,
        memberB: selfAlias,
        demandA: seededDemandAWithTokenId,
        demandB: seededDemandBWithTokenId,
      })
    })

    it('should get a match2', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededMatch2Id,
        state: 'pending',
        optimiser: selfAlias,
        memberA: selfAlias,
        memberB: selfAlias,
        demandA: seededDemandAId,
        demandB: seededDemandBId,
        createdAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('should get all match2s', async () => {
      const { status, body } = await get(app, `/v1/match2`)
      expect(status).to.equal(200)
      expect(body).to.be.an('array')
      expect(body.find(({ id }: { id: string }) => id === seededMatch2Id)).to.deep.equal({
        id: seededMatch2Id,
        state: 'pending',
        optimiser: selfAlias,
        memberA: selfAlias,
        memberB: selfAlias,
        demandA: seededDemandAId,
        demandB: seededDemandBId,
        createdAt: exampleDate,
        updatedAt: exampleDate,
      })
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

    it('should filter rejection transactions based on updated date', async () => {
      const { status, body } = await get(
        app,
        `/v1/match2/${seededMatch2Id}/rejection?updated_since=2023-01-01T00:00:00.000Z`
      )
      expect(status).to.equal(200)
      expect(body).to.deep.equal([])
    })

    it('cancels an existing match2 that is in final state', async () => {
      const { status, body } = await post(app, `/v1/match2/${seededMatch2AcceptedFinal}/cancellation`, {})

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

    it('non-existent demandA - 400', async () => {
      const response = await post(app, '/v1/match2', { demandA: nonExistentId, demandB: seededDemandBId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA not found')
    })

    it('non-existent demandB - 400', async () => {
      //this failed on DemandAId - cuz it was pending; now using DemandA with tokenid because it is in 'created' state
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
      //fails because demandA is pending - using demandAWithTokenId instead
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
      //seededDemandA was in pending state - using demandAwith token id instead
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

    it('incorrect state when creating on-chain - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2AcceptedA}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`state must be pending, is: acceptedA`)
    })

    it('demandA missing token ID - 400', async () => {
      // const createMatch2 = await post(app, '/v1/match2', {
      //   demandA: seededDemandAMissingTokenId,
      //   demandB: seededDemandBId,
      // })
      // expect(createMatch2.status).to.equal(201) //the above will not be created

      // const response = await post(app, `/v1/match2/${createMatch2.body.id}/proposal`, {})
      // expect(response.status).to.equal(400)
      // expect(response.body).to.equal('state must be created, is: pending')

      //====================== UPDATED: =====================
      const createMatch2 = await post(app, '/v1/match2', {
        demandA: seededDemandAMissingTokenId,
        demandB: seededDemandBWithTokenId,
      })
      expect(createMatch2.status).to.equal(400)
    })

    it('demandB missing token ID - 400', async () => {
      //same issue as above
      const createMatch2 = await post(app, '/v1/match2', {
        demandA: seededDemandAWithTokenId,
        demandB: seededDemandBMissingTokenId,
      })
      expect(createMatch2.status).to.equal(400)
      // expect(createMatch2.status).to.equal(201)

      // const response = await post(app, `/v1/match2/${createMatch2.body.id}/proposal`, {})
      // expect(response.status).to.equal(400)
      // expect(response.body).to.equal('DemandB must be on chain')
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

    it('non-existent match2 when getting a proposal - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/proposal/${seededProposalTransactionId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent match2 when listing proposals - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/proposal`)
      expect(response.status).to.equal(404)
    })

    it('list proposals with invalid updatedSince - 422', async () => {
      const { status, body } = await get(app, `/v1/match2/${seededMatch2AcceptedA}/proposal?updated_since=foo`)
      expect(status).to.equal(422)
      expect(body).to.contain({
        name: 'ValidateError',
        message: 'Validation failed',
      })
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
      //updated the seed data with token id
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

    it('non-existent transaction when getting an accept - 404', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}/accept/${nonExistentId}`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('accept not found')
    })

    it('rejection of match2 at incorrect state - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2AcceptedFinal}/rejection`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`Match2 state must be one of: proposed, acceptedA, acceptedB`)
    })

    it('rejection of match2 submitter not in roles - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2NotInRoles}/rejection`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`You do not have a role on the match2`)
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

    it('non-existent match2 when cancelling - 404', async () => {
      const response = await post(app, `/v1/match2/a789ad47-91c3-446e-90f9-a7c9b233ea11/cancellation`, {})
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('with invalid role - 400', async () => {
      const response = await post(app, `/v1/match2/619fb8ca-4dd9-4843-8c7a-9d9c9474784e/cancellation`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('You do not have a role on the match2')
    })

    it('with invalid state - 400', async () => {
      const response = await post(app, `/v1/match2/f960e4a1-6182-4dd3-8ac2-6f3fad995551/cancellation`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('Match2 state must be acceptedFinal')
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

    it('non-existent match2 when listing cancellations - 404', async () => {
      const response = await get(app, `/v1/match2/${nonExistentId}/cancellation`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })
  })
})
