import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { post, get } from '../helper/routeHelper'
import {
  seed,
  cleanup,
  seededCapacityId,
  seededOrderId,
  nonExistentId,
  seededMatch2Id,
  seededOrderTokenId,
  seededCapacityTokenId,
  seededOrderMissingTokenId,
  seededCapacityMissingTokenId,
  seededProposalTransactionId,
  exampleDate,
  seededCapacityAlreadyAllocated,
  seededOrderAlreadyAllocated,
  seededMatch2WithAllocatedDemands,
  seededMatch2AcceptedA,
  seededMatch2TokenId,
  seededMatch2OrderNotOwnedId,
  seededMatch2AcceptedFinal,
  seededMatch2NotAcceptableB,
  seededMatch2NotAcceptableA,
  seededMatch2NotAcceptableBoth,
  seededAcceptTransactionId,
} from '../seeds'

import {
  selfAlias,
  identitySelfMock,
  match2ProposeMock,
  match2ProposeMockTokenIds,
  match2AcceptMock,
  match2AcceptMockTokenId,
  match2AcceptFinalMock,
  match2AcceptFinalMockTokenIds,
} from '../helper/mock'
import { Match2State } from '../../src/models/match2'
import { TransactionState, TransactionApiType, TransactionType } from '../../src/models/transaction'
import Database from '../../src/lib/db'
import { DemandState } from '../../src/models/demand'

const db = new Database()

describe('match2', () => {
  let app: Express

  before(async function () {
    app = await createHttpServer()
    identitySelfMock()
  })

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('happy path', () => {
    it('should create a match2', async () => {
      const response = await post(app, '/match2', { demandA: seededOrderId, demandB: seededCapacityId })
      expect(response.status).to.equal(201)

      const { id: responseId, ...responseRest } = response.body
      expect(responseId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(responseRest).to.deep.equal({
        state: Match2State.proposed,
        optimiser: selfAlias,
        memberA: selfAlias,
        memberB: selfAlias,
        demandA: seededOrderId,
        demandB: seededCapacityId,
      })
    })

    it('should get a match2', async () => {
      const response = await get(app, `/match2/${seededMatch2Id}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededMatch2Id,
        state: Match2State.proposed,
        optimiser: selfAlias,
        memberA: selfAlias,
        memberB: selfAlias,
        demandA: seededOrderId,
        demandB: seededCapacityId,
      })
    })

    it('should get all match2s', async () => {
      const response = await get(app, `/match2`)
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
      expect(response.body[0]).to.deep.equal({
        id: seededMatch2Id,
        state: Match2State.proposed,
        optimiser: selfAlias,
        memberA: selfAlias,
        memberB: selfAlias,
        demandA: seededOrderId,
        demandB: seededCapacityId,
      })
    })

    it('should propose a match2 on-chain', async () => {
      match2ProposeMock()
      // submit to chain
      const response = await post(app, `/match2/${seededMatch2Id}/proposal`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal(TransactionState.submitted)

      // check local transaction updates
      const [transaction] = await db.getTransaction(transactionId)
      expect(transaction.state).to.equal(TransactionState.finalised)

      // check local entities update with token id
      const [demandA] = await db.getDemand(seededOrderId)
      expect(demandA.latestTokenId).to.equal(match2ProposeMockTokenIds[0])
      expect(demandA.originalTokenId).to.equal(seededOrderTokenId)

      const [demandB] = await db.getDemand(seededCapacityId)
      expect(demandB.latestTokenId).to.equal(match2ProposeMockTokenIds[1])
      expect(demandB.originalTokenId).to.equal(seededCapacityTokenId)

      const [match2] = await db.getMatch2(seededMatch2Id)
      expect(match2.latestTokenId).to.equal(match2ProposeMockTokenIds[2])
      expect(match2.originalTokenId).to.equal(match2ProposeMockTokenIds[2])
    })

    it('it should get a proposal transaction', async () => {
      const response = await get(app, `/match2/${seededMatch2Id}/proposal/${seededProposalTransactionId}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededProposalTransactionId,
        apiType: TransactionApiType.match2,
        transactionType: TransactionType.proposal,
        localId: seededMatch2Id,
        state: TransactionState.submitted,
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('it should get all proposal transactions - 200', async () => {
      const response = await get(app, `/match2/${seededMatch2Id}/proposal`)
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
      expect(response.body[0]).to.deep.equal({
        id: seededProposalTransactionId,
        transactionType: TransactionType.proposal,
        apiType: TransactionApiType.match2,
        localId: seededMatch2Id,
        state: TransactionState.submitted,
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('should acceptA then acceptFinal a match2 on-chain', async () => {
      match2AcceptMock()
      // submit to chain
      const responseAcceptA = await post(app, `/match2/${seededMatch2Id}/accept`, {})
      expect(responseAcceptA.status).to.equal(201)

      // check local entities update with token id
      const [match2AcceptA] = await db.getMatch2(seededMatch2Id)
      expect(match2AcceptA.latestTokenId).to.equal(match2AcceptMockTokenId)
      expect(match2AcceptA.state).to.equal(Match2State.acceptedA)
      expect(match2AcceptA.originalTokenId).to.equal(seededMatch2TokenId)

      match2AcceptFinalMock()
      // submit to chain
      const responseAcceptFinal = await post(app, `/match2/${seededMatch2Id}/accept`, {})
      expect(responseAcceptFinal.status).to.equal(201)

      // check local entities update with token id
      const [demandA] = await db.getDemand(seededOrderId)
      expect(demandA.latestTokenId).to.equal(match2AcceptFinalMockTokenIds[0])
      expect(demandA.state).to.equal(DemandState.allocated)
      expect(demandA.originalTokenId).to.equal(seededOrderTokenId)

      const [demandB] = await db.getDemand(seededCapacityId)
      expect(demandB.latestTokenId).to.equal(match2AcceptFinalMockTokenIds[1])
      expect(demandB.state).to.equal(DemandState.allocated)
      expect(demandB.originalTokenId).to.equal(seededCapacityTokenId)

      const [matchAcceptFinal] = await db.getMatch2(seededMatch2Id)
      expect(matchAcceptFinal.latestTokenId).to.equal(match2AcceptFinalMockTokenIds[2])
      expect(matchAcceptFinal.state).to.equal(Match2State.acceptedFinal)
      expect(matchAcceptFinal.originalTokenId).to.equal(seededMatch2TokenId)
    })

    it('should acceptB a match2 on-chain', async () => {
      match2AcceptMock()
      // submit to chain
      const response = await post(app, `/match2/${seededMatch2OrderNotOwnedId}/accept`, {})
      expect(response.status).to.equal(201)

      // check local entities update with token id
      const [match2] = await db.getMatch2(seededMatch2OrderNotOwnedId)
      expect(match2.latestTokenId).to.equal(match2AcceptMockTokenId)
      expect(match2.state).to.equal(Match2State.acceptedB)
      expect(match2.originalTokenId).to.equal(seededMatch2TokenId)
    })

    it('it should get an accept transaction', async () => {
      const response = await get(app, `/match2/${seededMatch2Id}/accept/${seededAcceptTransactionId}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededAcceptTransactionId,
        apiType: TransactionApiType.match2,
        transactionType: TransactionType.accept,
        localId: seededMatch2Id,
        state: TransactionState.submitted,
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('it should get all accept transactions', async () => {
      const response = await get(app, `/match2/${seededMatch2Id}/accept`)
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
      expect(response.body[0]).to.deep.equal({
        id: seededAcceptTransactionId,
        apiType: TransactionApiType.match2,
        transactionType: TransactionType.accept,
        localId: seededMatch2Id,
        state: TransactionState.submitted,
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })
  })

  describe('sad path', () => {
    it('non-existent demandA - 400', async () => {
      const response = await post(app, '/match2', { demandA: nonExistentId, demandB: seededCapacityId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA not found')
    })

    it('non-existent demandB - 400', async () => {
      const response = await post(app, '/match2', { demandA: seededOrderId, demandB: nonExistentId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandB not found')
    })

    it('demandA not an order - 400', async () => {
      const response = await post(app, '/match2', { demandA: seededCapacityId, demandB: seededCapacityId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA must be order')
    })

    it('demandB not a capacity - 400', async () => {
      const response = await post(app, '/match2', { demandA: seededOrderId, demandB: seededOrderId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandB must be capacity')
    })

    it('demandA allocated - 400', async () => {
      const response = await post(app, '/match2', { demandA: seededOrderAlreadyAllocated, demandB: seededCapacityId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA is already allocated')
    })

    it('demandB allocated - 400', async () => {
      const response = await post(app, '/match2', { demandA: seededOrderId, demandB: seededCapacityAlreadyAllocated })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandB is already allocated')
    })

    it('invalid demand uuid - 422', async () => {
      const response = await post(app, '/match2', { demandA: 'invalid', demandB: seededCapacityId })
      expect(response.status).to.equal(422)
      expect(response.body.message).to.equal('Validation failed')
    })

    it('non-existent match2 id - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('incorrect state when creating on-chain - 400', async () => {
      const response = await post(app, `/match2/${seededMatch2AcceptedA}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`Match2 must have state: ${Match2State.proposed}`)
    })

    it('demandA missing token ID - 400', async () => {
      const createMatch2 = await post(app, '/match2', { demandA: seededOrderMissingTokenId, demandB: seededCapacityId })
      expect(createMatch2.status).to.equal(201)

      const response = await post(app, `/match2/${createMatch2.body.id}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA must be on chain')
    })

    it('demandB missing token ID - 400', async () => {
      const createMatch2 = await post(app, '/match2', { demandA: seededOrderId, demandB: seededCapacityMissingTokenId })
      expect(createMatch2.status).to.equal(201)

      const response = await post(app, `/match2/${createMatch2.body.id}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandB must be on chain')
    })

    it('demand allocated - 400', async () => {
      const response = await post(app, `/match2/${seededMatch2WithAllocatedDemands}/proposal`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('DemandA is already allocated')
    })

    it('non-existent proposal ID - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}/proposal/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent match2 when getting a proposal - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}/proposal/${seededProposalTransactionId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent match2 when listing proposals - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}/proposal`)
      expect(response.status).to.equal(404)
    })

    it('match2 at acceptA and DemandB not owned - 400', async () => {
      const response = await post(app, `/match2/${seededMatch2NotAcceptableA}/accept`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`You do not own an acceptable demand`)
    })

    it('match2 at acceptB and DemandA not owned - 400', async () => {
      const response = await post(app, `/match2/${seededMatch2NotAcceptableB}/accept`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`You do not own an acceptable demand`)
    })

    it('neither demand owned - 400', async () => {
      const response = await post(app, `/match2/${seededMatch2NotAcceptableBoth}/accept`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`You do not own an acceptable demand`)
    })

    it('match2 already acceptedFinal when accepting - 400', async () => {
      const response = await post(app, `/match2/${seededMatch2AcceptedFinal}/accept`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`Already ${Match2State.acceptedFinal}`)
    })

    it('non-existent match2 id when accepting - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}/accept`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('non-existent match2 when listing accepts - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}/proposal`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('non-existent match2 when getting an accept - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}/accept/${seededAcceptTransactionId}`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('match2 not found')
    })

    it('non-existent transaction when getting an accept - 404', async () => {
      const response = await get(app, `/match2/${seededMatch2Id}/accept/${nonExistentId}`)
      expect(response.status).to.equal(404)
      expect(response.body).to.equal('accept not found')
    })
  })
})