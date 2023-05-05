import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server'
import { post, get } from '../../helper/routeHelper'
import {
  seed,
  cleanup,
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
} from '../../seeds'

import { selfAlias, withIdentitySelfMock } from '../../helper/mock'
import { assertIsoDate, assertUUID } from '../../helper/assertions'

describe('match2', () => {
  let app: Express

  before(async function () {
    app = await createHttpServer()
  })

  withIdentitySelfMock()

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('happy path', () => {
    it('should create a match2', async () => {
      const response = await post(app, '/v1/match2', { demandA: seededDemandAId, demandB: seededDemandBId })
      expect(response.status).to.equal(201)

      const { id: responseId, createdAt, updatedAt, ...responseRest } = response.body
      assertUUID(responseId)
      assertIsoDate(createdAt)
      assertIsoDate(updatedAt)
      expect(responseRest).to.deep.equal({
        state: 'proposed',
        optimiser: selfAlias,
        memberA: selfAlias,
        memberB: selfAlias,
        demandA: seededDemandAId,
        demandB: seededDemandBId,
      })
    })

    it('should get a match2', async () => {
      const response = await get(app, `/v1/match2/${seededMatch2Id}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededMatch2Id,
        state: 'proposed',
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
      const response = await get(app, `/v1/match2`)
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
      expect(response.body[0]).to.deep.equal({
        id: seededMatch2Id,
        state: 'proposed',
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
      const response = await post(app, '/v1/match2', { demandA: seededDemandAId, demandB: nonExistentId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandB not found')
    })

    it('demandA not an demandA - 400', async () => {
      const response = await post(app, '/v1/match2', { demandA: seededDemandBId, demandB: seededDemandBId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA must be demand_a')
    })

    it('demandB not a demandB - 400', async () => {
      const response = await post(app, '/v1/match2', { demandA: seededDemandAId, demandB: seededDemandAId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandB must be demand_b')
    })

    it('demandA allocated - 400', async () => {
      const response = await post(app, '/v1/match2', {
        demandA: seededDemandAAlreadyAllocated,
        demandB: seededDemandBId,
      })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA is already allocated')
    })

    it('demandB allocated - 400', async () => {
      const response = await post(app, '/v1/match2', {
        demandA: seededDemandAId,
        demandB: seededDemandBAlreadyAllocated,
      })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandB is already allocated')
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
      expect(response.body).to.equal(`Match2 must have state: ${'proposed'}`)
    })

    it('demandA missing token ID - 400', async () => {
      const createMatch2 = await post(app, '/v1/match2', {
        demandA: seededDemandAMissingTokenId,
        demandB: seededDemandBId,
      })
      expect(createMatch2.status).to.equal(201)

      const response = await post(app, `/v1/match2/${createMatch2.body.id}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA must be on chain')
    })

    it('demandB missing token ID - 400', async () => {
      const createMatch2 = await post(app, '/v1/match2', {
        demandA: seededDemandAWithTokenId,
        demandB: seededDemandBMissingTokenId,
      })
      expect(createMatch2.status).to.equal(201)

      const response = await post(app, `/v1/match2/${createMatch2.body.id}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandB must be on chain')
    })

    it('demand allocated - 400', async () => {
      const response = await post(app, `/v1/match2/${seededMatch2WithAllocatedDemands}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA is already allocated')
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
      const response = await post(app, `/v1/match2/${seededMatch2AcceptedFinal}/accept`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`Already ${'acceptedFinal'}`)
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
  })
})
