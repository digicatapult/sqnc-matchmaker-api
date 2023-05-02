import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server'
import { post, get } from '../../helper/routeHelper'
import {
  seed,
  cleanup,
  parametersAttachmentId,
  seededCapacityId,
  nonExistentId,
  seededTransactionId,
  seededTransactionId2,
  exampleDate,
  seededCapacityAlreadyAllocated,
} from '../../seeds'

import { selfAlias, withIdentitySelfMock } from '../../helper/mock'

describe('capacity', () => {
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
    it('should create a capacity', async () => {
      const response = await post(app, '/v1/capacity', { parametersAttachmentId })
      expect(response.status).to.equal(201)

      const { id: responseId, ...responseRest } = response.body
      expect(responseId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(responseRest).to.deep.equal({
        parametersAttachmentId,
        state: 'created',
        owner: selfAlias,
      })
    })

    it('should get a capacity', async () => {
      const response = await get(app, `/v1/capacity/${seededCapacityId}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededCapacityId,
        owner: selfAlias,
        state: 'created',
        parametersAttachmentId,
      })
    })

    it('should get all capacities', async () => {
      const response = await get(app, `/v1/capacity`)
      expect(response.status).to.equal(200)
      expect(response.body.length).to.be.greaterThan(0)
      expect(response.body[0]).to.deep.equal({
        id: seededCapacityId,
        owner: selfAlias,
        state: 'created',
        parametersAttachmentId,
      })
    })

    it('it should get a transaction', async () => {
      const response = await get(app, `/v1/capacity/${seededCapacityId}/creation/${seededTransactionId}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededTransactionId,
        apiType: 'capacity',
        transactionType: 'creation',
        localId: seededCapacityId,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('it should get all transactions from a capacity ID - 200', async () => {
      const response = await get(app, `/v1/capacity/${seededCapacityId}/creation/`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([
        {
          id: seededTransactionId,
          apiType: 'capacity',
          transactionType: 'creation',
          localId: seededCapacityId,
          state: 'submitted',
          submittedAt: exampleDate,
          updatedAt: exampleDate,
        },
        {
          id: seededTransactionId2,
          apiType: 'capacity',
          transactionType: 'creation',
          localId: seededCapacityId,
          state: 'submitted',
          submittedAt: exampleDate,
          updatedAt: exampleDate,
        },
      ])
    })
  })

  describe('sad path', () => {
    it('invalid attachment uuid - 422', async () => {
      const response = await post(app, '/v1/capacity', { parametersAttachmentId: 'invalid' })
      expect(response.status).to.equal(422)
      expect(response.body.message).to.equal('Validation failed')
    })

    it('non-existent attachment - 400', async () => {
      const response = await post(app, '/v1/capacity', { parametersAttachmentId: nonExistentId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('Attachment id not found')
    })

    it('non-existent capacity id - 404', async () => {
      const response = await get(app, `/v1/capacity/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent capacity id when creating on-chain - 404', async () => {
      const response = await post(app, `/v1/capacity/${nonExistentId}/creation`, {})
      expect(response.status).to.equal(404)
    })

    it('incorrect state when creating on-chain - 400', async () => {
      const response = await post(app, `/v1/capacity/${seededCapacityAlreadyAllocated}/creation`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`Demand must have state: ${'created'}`)
    })

    it('non-existent Creation ID - 404', async () => {
      const response = await get(app, `/v1/capacity/${seededCapacityId}/creation/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent Capacity ID when using a Creation ID - 404', async () => {
      const response = await get(app, `/v1/capacity/${nonExistentId}/creation/${seededTransactionId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent Capacity ID should return nothing - 404', async () => {
      const response = await get(app, `/v1/capacity/${nonExistentId}/creation/`)
      expect(response.status).to.equal(404)
    })
  })
})
