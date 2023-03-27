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
} from '../seeds'

import { selfAlias, identitySelfMock, match2ProposeMock, match2ProposeMockTokenIds } from '../helper/mock'
import { Match2State } from '../../src/models/match2'
import { TransactionState } from '../../src/models/transaction'
import Database from '../../src/lib/db'
import { TokenType } from '../../src/models/tokenType'

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
      expect(response.body.length).to.equal(2)
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

    it('should create a match2 on-chain', async () => {
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
        tokenType: TokenType.MATCH2,
        localId: seededMatch2Id,
        state: TransactionState.submitted,
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('it should get all proposal transactions - 200', async () => {
      const response = await get(app, `/match2/${seededMatch2Id}/proposal`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([
        {
          id: seededProposalTransactionId,
          tokenType: TokenType.MATCH2,
          localId: seededMatch2Id,
          state: TransactionState.submitted,
          submittedAt: exampleDate,
          updatedAt: exampleDate,
        },
      ])
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
      const response = await get(app, `/match2/${nonExistentId}/creation/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent match2 when getting a proposal - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}/proposal/${seededProposalTransactionId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent match2 when listing proposals - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}/proposal/`)
      expect(response.status).to.equal(404)
    })
  })
})
