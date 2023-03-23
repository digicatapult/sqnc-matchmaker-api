import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { post, get } from '../helper/routeHelper'
import { seed, cleanup, seededCapacityId, seededOrderId, nonExistentId, seededMatch2Id } from '../seeds'

import { selfAlias, identitySelfMock, apiRunProcessMock, mockTokenIds } from '../helper/mock'
import { Match2State } from '../../src/models/match2'
import { TransactionState } from '../../src/models/transaction'
import Database from '../../src/lib/db'

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
      expect(response.body.length).to.equal(1)
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
      apiRunProcessMock()
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
      expect(transaction.token_id).to.equal(mockTokenIds[0])
      expect(transaction.state).to.equal(TransactionState.finalised)

      // check local match2 updates with token id
      const [match2] = await db.getMatch2(seededMatch2Id)
      expect(match2.latestTokenId).to.equal(mockTokenIds[0])
      expect(match2.originalTokenId).to.equal(mockTokenIds[0])
    })
  })

  describe('sad path', () => {
    it('non-existent demandA - 400', async () => {
      const response = await post(app, '/match2', { demandA: nonExistentId, demandB: seededCapacityId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('Demand A not found')
    })

    it('non-existent demandB - 400', async () => {
      const response = await post(app, '/match2', { demandA: seededOrderId, demandB: nonExistentId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('Demand B not found')
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

    it('invalid demand uuid - 422', async () => {
      const response = await post(app, '/match2', { demandA: 'invalid', demandB: seededCapacityId })
      expect(response.status).to.equal(422)
      expect(response.body.message).to.equal('Validation failed')
    })

    it('non-existent match2 id - 404', async () => {
      const response = await get(app, `/match2/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })
  })
})
