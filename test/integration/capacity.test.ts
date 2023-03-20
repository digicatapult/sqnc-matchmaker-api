import { describe, before, test } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { post, get } from '../helper/routeHelper'
import { seed, cleanup, parametersAttachmentId, seededCapacityId } from '../seeds/capacity'

import { DemandState } from '../../src/models/demand'
import { setupMocks, selfAlias, mockTokenId } from '../helper/mock'
import { TransactionState } from '../../src/models/transaction'
import Database from '../../src/lib/db'

const db = new Database()

describe('capacity', () => {
  let app: Express
  setupMocks()

  before(async function () {
    app = await createHttpServer()
  })

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('happy path', () => {
    test('it should create a capacity', async () => {
      const response = await post(app, '/capacity', { parametersAttachmentId })
      expect(response.status).to.equal(201)

      const { id: responseId, ...responseRest } = response.body
      expect(responseId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(responseRest).to.deep.equal({
        parametersAttachmentId,
        state: DemandState.created,
        owner: selfAlias,
      })
    })

    test('it should get a capacity', async () => {
      const response = await get(app, `/capacity/${seededCapacityId}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededCapacityId,
        owner: selfAlias,
        state: DemandState.created,
        parametersAttachmentId,
      })
    })

    test('it should get all capacities', async () => {
      const response = await get(app, `/capacity`)
      expect(response.status).to.equal(200)
      expect(response.body.length).to.equal(1)
      expect(response.body[0]).to.deep.equal({
        id: seededCapacityId,
        owner: selfAlias,
        state: DemandState.created,
        parametersAttachmentId,
      })
    })

    test('it should create a capacity on-chain', async () => {
      // submit to chain
      const response = await post(app, `/capacity/${seededCapacityId}/creation`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal(TransactionState.submitted)

      // check local transaction updates
      const [transaction] = await db.getTransaction(transactionId)
      expect(transaction.token_id).to.equal(mockTokenId)
      expect(transaction.state).to.equal(TransactionState.finalised)

      // check local capacity updates with token id
      const [capacity] = await db.getDemand(seededCapacityId)
      expect(capacity.latest_token_id).to.equal(mockTokenId)
      expect(capacity.original_token_id).to.equal(mockTokenId)
    })
  })

  describe('sad path', () => {
    test('invalid attachment uuid - 422', async () => {
      const response = await post(app, '/capacity', { parametersAttachmentId: 'invalid' })
      expect(response.status).to.equal(422)
      expect(response.body.message).to.equal('Validation failed')
    })

    test('non-existent attachment - 400', async () => {
      const response = await post(app, '/capacity', { parametersAttachmentId: 'a789ad47-91c3-446e-90f9-a7c9b233eaf9' })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('Bad Request: Attachment id not found')
    })

    it('non-existent capacity id - 404', async () => {
      const response = await get(app, `/capacity/a789ad47-91c3-446e-90f9-a7c9b233eaf9`)
      expect(response.status).to.equal(404)
    })

    it('non-existent capacity id when creating on-chain - 404', async () => {
      const response = await get(app, `/capacity/a789ad47-91c3-446e-90f9-a7c9b233eaf9/creation`)
      expect(response.status).to.equal(404)
    })
  })
})
