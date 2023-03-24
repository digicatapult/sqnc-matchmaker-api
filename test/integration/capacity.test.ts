import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { post, get } from '../helper/routeHelper'
import { seed, cleanup, parametersAttachmentId, seededCapacityId, nonExistentId, seededTransactionId, seededTransactionId2 } from '../seeds'

import { DemandState } from '../../src/models/demand'
import {
  selfAlias,
  identitySelfMock,
  demandCreateMock,
  apiRunProcessMockError,
  demandCreateTokenId,
} from '../helper/mock'
import { TransactionState } from '../../src/models/transaction'
import Database from '../../src/lib/db'
import { TokenType } from '../../src/models/tokenType'


const db = new Database()

describe('capacity', () => {
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
    it('should create a capacity', async () => {
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

    it('should get a capacity', async () => {
      const response = await get(app, `/capacity/${seededCapacityId}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededCapacityId,
        owner: selfAlias,
        state: DemandState.created,
        parametersAttachmentId,
      })
    })

    it('should get all capacities', async () => {
      const response = await get(app, `/capacity`)
      expect(response.status).to.equal(200)
      expect(response.body.length).to.equal(2)
      expect(response.body[0]).to.deep.equal({
        id: seededCapacityId,
        owner: selfAlias,
        state: DemandState.created,
        parametersAttachmentId,
      })
    })

    it('should create a capacity on-chain', async () => {
      demandCreateMock()
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
      expect(transaction.state).to.equal(TransactionState.finalised)

      // check local capacity updates with token id
      const [capacity] = await db.getDemand(seededCapacityId)
      expect(capacity.latestTokenId).to.equal(demandCreateTokenId)
      expect(capacity.originalTokenId).to.equal(demandCreateTokenId)
    })

    it('it should get a transaction', async () => {
      const response = await get(app, `/capacity/${seededCapacityId}/creation/${seededTransactionId}`)
      expect(response.status).to.equal(200)      
      expect(response.body).to.deep.equal(
        {
          id: seededTransactionId,
          token_type: TokenType.DEMAND,
          local_id: seededCapacityId,
          state: TransactionState.submitted,
          token_id: 6006,
          created_at: '2023-03-24T10:40:47.317Z',
          updated_at: '2023-03-24T10:40:47.317Z',
        }
      )
    })

    it('it should get all transactions from a capacity ID - 200', async () => {
      const response = await get(app, `/capacity/${seededCapacityId}/creation/`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal(
        [
          {
            id: seededTransactionId,
            token_type: TokenType.DEMAND,
            local_id: seededCapacityId,
            state: TransactionState.submitted,
            created_at: '2023-03-24T10:40:47.317Z',
            updated_at: '2023-03-24T10:40:47.317Z',
            token_id: 6006
          },
          {
            id: seededTransactionId2,
            token_type: TokenType.DEMAND,
            local_id: seededCapacityId,
            state: TransactionState.submitted,
            created_at: '2023-03-24T10:40:47.317Z',
            updated_at: '2023-03-24T10:40:47.317Z',
            token_id: 7000
          }
        ]
      )      
    })

  })



  describe('sad path', () => {
    it('invalid attachment uuid - 422', async () => {
      const response = await post(app, '/capacity', { parametersAttachmentId: 'invalid' })
      expect(response.status).to.equal(422)
      expect(response.body.message).to.equal('Validation failed')
    })

    it('non-existent attachment - 400', async () => {
      const response = await post(app, '/capacity', { parametersAttachmentId: nonExistentId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('Attachment id not found')
    })

    it('non-existent capacity id - 404', async () => {
      const response = await get(app, `/capacity/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent capacity id when creating on-chain - 404', async () => {
      const response = await get(app, `/capacity/${nonExistentId}/creation`)
      expect(response.status).to.equal(404)
    })

    it('dscp-api error - 500', async () => {
      apiRunProcessMockError()
      const response = await post(app, `/capacity/${seededCapacityId}/creation`, {})
      expect(response.status).to.equal(500)
    })

    it('non-existant Creation ID - 404', async () => {
      const response = await get(app, `/capacity/${nonExistentId}/creation/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existant Capacity ID when using a Creation ID - 404', async () => {
      const response = await get(app, `/capacity/${nonExistentId}/creation/${seededTransactionId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existant Capacity ID should return nothing - 404', async () => {
      const response = await get(app, `/capacity/${nonExistentId}/creation/`)
      console.log(response.body)
      expect(response.status).to.equal(404)
    })
  })
})
