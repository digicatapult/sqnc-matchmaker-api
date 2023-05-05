import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server'
import { post, get } from '../../helper/routeHelper'
import {
  seed,
  cleanup,
  parametersAttachmentId,
  seededDemandBId,
  nonExistentId,
  seededTransactionId,
  seededTransactionId2,
  exampleDate,
  seededDemandBAlreadyAllocated,
} from '../../seeds'

import { selfAlias, withIdentitySelfMock } from '../../helper/mock'
import { assertIsoDate, assertUUID } from '../../helper/assertions'

describe('demandB', () => {
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
    it('should create a demandB', async () => {
      const response = await post(app, '/v1/demandB', { parametersAttachmentId })
      expect(response.status).to.equal(201)

      const { id: responseId, createdAt, updatedAt, ...responseRest } = response.body
      assertUUID(responseId)
      assertIsoDate(createdAt)
      assertIsoDate(updatedAt)
      expect(responseRest).to.deep.equal({
        parametersAttachmentId,
        state: 'created',
        owner: selfAlias,
      })
    })

    it('should get a demandB', async () => {
      const response = await get(app, `/v1/demandB/${seededDemandBId}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededDemandBId,
        owner: selfAlias,
        state: 'created',
        parametersAttachmentId,
        createdAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('should get all demandBs', async () => {
      const { status, body } = await get(app, `/v1/demandB`)
      expect(status).to.equal(200)
      expect(body).to.be.an('array')
      expect(body.find(({ id }: { id: string }) => id === seededDemandBId)).to.deep.equal({
        createdAt: exampleDate,
        id: seededDemandBId,
        owner: selfAlias,
        parametersAttachmentId: parametersAttachmentId,
        state: 'created',
        updatedAt: exampleDate,
      })
    })

    it('should filter based on updated date', async () => {
      const { status, body } = await get(app, `/v1/demandB?updatedSince=2023-01-01T00:00:00.000Z`)
      expect(status).to.equal(200)
      expect(body).to.deep.equal([])
    })

    it('should get a transaction', async () => {
      const response = await get(app, `/v1/demandB/${seededDemandBId}/creation/${seededTransactionId}`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal({
        id: seededTransactionId,
        apiType: 'demand_b',
        transactionType: 'creation',
        localId: seededDemandBId,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
    })

    it('should get all transactions from a demandB ID - 200', async () => {
      const response = await get(app, `/v1/demandB/${seededDemandBId}/creation`)
      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([
        {
          id: seededTransactionId,
          apiType: 'demand_b',
          transactionType: 'creation',
          localId: seededDemandBId,
          state: 'submitted',
          submittedAt: exampleDate,
          updatedAt: exampleDate,
        },
        {
          id: seededTransactionId2,
          apiType: 'demand_b',
          transactionType: 'creation',
          localId: seededDemandBId,
          state: 'submitted',
          submittedAt: exampleDate,
          updatedAt: exampleDate,
        },
      ])
    })

    it('should filter demandB creations based on updated date', async () => {
      const { status, body } = await get(
        app,
        `/v1/demandB/${seededDemandBId}/creation?updatedSince=2023-01-01T00:00:00.000Z`
      )
      expect(status).to.equal(200)
      expect(body).to.deep.equal([])
    })
  })

  describe('sad path', () => {
    it('if updatedSince is not a date returns 422', async () => {
      const { status, body } = await get(app, `/v1/demandB?updatedSince=foo`)
      expect(status).to.equal(422)
      expect(body).to.contain({
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })

    it('invalid attachment uuid - 422', async () => {
      const response = await post(app, '/v1/demandB', { parametersAttachmentId: 'invalid' })
      expect(response.status).to.equal(422)
      expect(response.body.message).to.equal('Validation failed')
    })

    it('non-existent attachment - 400', async () => {
      const response = await post(app, '/v1/demandB', { parametersAttachmentId: nonExistentId })
      expect(response.status).to.equal(400)
      expect(response.body).to.equal('Attachment id not found')
    })

    it('non-existent demandB id - 404', async () => {
      const response = await get(app, `/v1/demandB/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent demandB id when creating on-chain - 404', async () => {
      const response = await post(app, `/v1/demandB/${nonExistentId}/creation`, {})
      expect(response.status).to.equal(404)
    })

    it('demandB creations with invalid updatedSince - 422', async () => {
      const { status, body } = await get(app, `/v1/demandB/${seededDemandBId}/creation?updatedSince=foo`)
      expect(status).to.equal(422)
      expect(body).to.contain({
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })

    it('incorrect state when creating on-chain - 400', async () => {
      const response = await post(app, `/v1/demandB/${seededDemandBAlreadyAllocated}/creation`, {})
      expect(response.status).to.equal(400)
      expect(response.body).to.equal(`Demand must have state: ${'created'}`)
    })

    it('non-existent Creation ID - 404', async () => {
      const response = await get(app, `/v1/demandB/${seededDemandBId}/creation/${nonExistentId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent demandB ID when using a Creation ID - 404', async () => {
      const response = await get(app, `/v1/demandB/${nonExistentId}/creation/${seededTransactionId}`)
      expect(response.status).to.equal(404)
    })

    it('non-existent DemandB ID should return nothing - 404', async () => {
      const response = await get(app, `/v1/demandB/${nonExistentId}/creation/`)
      expect(response.status).to.equal(404)
    })
  })
})
