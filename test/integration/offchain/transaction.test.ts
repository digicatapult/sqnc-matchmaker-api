import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server.js'
import { get } from '../../helper/routeHelper.js'
import {
  cleanup,
  transactionSeed,
  nonExistentId,
  seededDemandBCommentTransactionId,
  seededDemandBId,
  exampleDate,
  seededDemandBCommentTransactionId2,
  seededDemandACommentTransactionId,
  seededDemandAId,
  seededDemandACommentTransactionId2,
} from '../../seeds/offchainSeeds/transaction.seed.js'
import { resetContainer } from '../../../src/ioc.js'
import { TransactionResponse } from '../../../src/models/transaction.js'

describe('transaction', () => {
  resetContainer()
  let app: Express

  before(async function () {
    app = await createHttpServer()
  })

  beforeEach(async function () {
    await transactionSeed()
  })

  afterEach(async function () {
    await cleanup()
  })

  // handling all errors - error handling reflects whats in code, 422 first because being handled by TSOA/OPEN-API
  describe('if transaction id is not UUID or bad request', () => {
    it('returns 422 along with validation error', async () => {
      const { status, body } = await get(app, '/v1/transaction/123-not-uuid')

      expect(status).to.equal(422)
      expect(body).to.deep.contain({
        fields: {
          transactionId: {
            message:
              "Not match in '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}'",
            value: '123-not-uuid',
          },
        },
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })
  })

  describe('when requested transaction can not be found', () => {
    it('returns 404 along with the message', async () => {
      const { status, body } = await get(app, `/v1/transaction/${nonExistentId}`)

      expect(status).to.equal(404)
      expect(body).to.equal('transaction not found')
    })
  })

  it('returns empty array if database contains 0 transactions', async () => {
    await cleanup()
    const { status, body } = await get(app, '/v1/transaction')

    expect(status).to.equal(200)
    expect(body).to.be.an('array')
    expect(body.length).to.equal(0)
  })

  it('also returns an empty array if 0 transactions found by type', async () => {
    await cleanup()
    const { status, body } = await get(app, '/v1/transaction?apiType=demand_a')

    expect(status).to.equal(200)
    expect(body).to.be.an('array')
    expect(body.length).to.equal(0)
  })

  it('returns transaction by id', async () => {
    const { status, body } = await get(app, '/v1/transaction/1f3af974-7d4d-40b4-86a5-94a2241265cb')

    expect(status).to.equal(200)
    expect(body).to.deep.contain({
      id: '1f3af974-7d4d-40b4-86a5-94a2241265cb',
      state: 'submitted',
      localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
      apiType: 'demand_b',
      transactionType: 'creation',
      submittedAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    })
  })

  it('returns transaction by id - scope', async () => {
    const { status } = await get(app, `/v1/transaction/${seededDemandACommentTransactionId}`, {}, 'demandA:read')
    expect(status).to.equal(200)
  })

  it('returns all transactions', async () => {
    const { status, body } = await get(app, '/v1/transaction')

    expect(status).to.equal(200)
    expect(body).to.be.an('array')
    expect(body).to.deep.include.members([
      {
        id: '1f3af974-7d4d-40b4-86a5-94a2241265cb',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'demand_b',
        transactionType: 'creation',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: 'd65d8e11-150f-4ea4-b778-b920e9dbc378',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'demand_b',
        transactionType: 'creation',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: seededDemandBCommentTransactionId,
        apiType: 'demand_b',
        transactionType: 'comment',
        localId: seededDemandBId,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      },
      {
        id: seededDemandBCommentTransactionId2,
        apiType: 'demand_b',
        transactionType: 'comment',
        localId: seededDemandBId,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      },
      {
        id: seededDemandACommentTransactionId,
        apiType: 'demand_a',
        transactionType: 'comment',
        localId: seededDemandAId,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      },
      {
        id: seededDemandACommentTransactionId2,
        apiType: 'demand_a',
        transactionType: 'comment',
        localId: seededDemandAId,
        state: 'submitted',
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      },
      {
        id: '8a5343dc-88a3-4b61-b156-330d52f506f8',
        state: 'submitted',
        localId: 'f960e4a1-6182-4dd3-8ac2-6f3fad995551',
        apiType: 'match2',
        transactionType: 'proposal',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: 'd8eb8a94-222b-4481-b315-1dcbf2e07079',
        state: 'submitted',
        localId: 'f960e4a1-6182-4dd3-8ac2-6f3fad995551',
        apiType: 'match2',
        transactionType: 'accept',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ])
  })

  it('returns only demand_a transactions - scope', async () => {
    const { status, body } = await get(app, '/v1/transaction', {}, 'demandA:read')

    expect(status).to.equal(200)
    expect(body.every((transaction: TransactionResponse) => transaction.apiType === 'demand_a')).to.equal(true)
  })

  it('returns only demand_b transactions - scope', async () => {
    const { status, body } = await get(app, '/v1/transaction', {}, 'demandB:read')

    expect(status).to.equal(200)
    expect(body.every((transaction: TransactionResponse) => transaction.apiType === 'demand_b')).to.equal(true)
  })

  it('returns all match2 transactions - scope', async () => {
    const { status, body } = await get(app, '/v1/transaction', {}, 'match2:read')

    expect(status).to.equal(200)
    expect(body.every((transaction: TransactionResponse) => transaction.apiType === 'match2')).to.equal(true)
  })

  it('should return 401 listing transactions when unauthenticated', async () => {
    const { status } = await get(app, `/v1/transaction`, { authorization: 'bearer invalid' })
    expect(status).to.equal(401)
  })

  it('missing scope list transactions - 401', async () => {
    const response = await get(app, `/v1/transaction`, {}, '')
    expect(response.status).to.equal(401)
    expect(response.body.message).to.contain('MISSING_SCOPES')
  })

  it('should return 401 get transaction when unauthenticated', async () => {
    const { status } = await get(app, `/v1/transaction/${seededDemandACommentTransactionId}`, {
      authorization: 'bearer invalid',
    })
    expect(status).to.equal(401)
  })

  it('missing all scopes get transaction - 401', async () => {
    const response = await get(app, `/v1/transaction/${seededDemandACommentTransactionId}`, {}, '')
    expect(response.status).to.equal(401)
    expect(response.body.message).to.contain('MISSING_SCOPES')
  })

  it('incorrect scope get transaction - 401', async () => {
    const response = await get(app, `/v1/transaction/${seededDemandACommentTransactionId}`, {}, 'demandB:read')
    expect(response.status).to.equal(401)
    expect(response.body.message).to.contain('MISSING_SCOPES')
  })

  it('should filter transactions based on updated date', async () => {
    const { status, body } = await get(app, `/v1/transaction?updated_since=2023-01-01T00:00:00.000Z`)
    expect(status).to.equal(200)
    expect(body).to.deep.equal([])
  })

  it('returns transactions by type', async () => {
    const { status, body } = await get(app, '/v1/transaction?apiType=demand_b')

    expect(status).to.equal(200)
    expect(body).to.deep.include.members([
      {
        id: '1f3af974-7d4d-40b4-86a5-94a2241265cb',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'demand_b',
        transactionType: 'creation',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: 'd65d8e11-150f-4ea4-b778-b920e9dbc378',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'demand_b',
        transactionType: 'creation',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ])
  })

  it('returns transactions by status', async () => {
    const { status, body } = await get(app, '/v1/transaction?status=submitted')

    expect(status).to.equal(200)
    expect(body).to.deep.include.members([
      {
        id: '1f3af974-7d4d-40b4-86a5-94a2241265cb',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'demand_b',
        transactionType: 'creation',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: 'd65d8e11-150f-4ea4-b778-b920e9dbc378',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'demand_b',
        transactionType: 'creation',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ])
  })

  it('returns transactions by status and type', async () => {
    const { status, body } = await get(app, '/v1/transaction?apiType=demand_b&status=submitted')

    expect(status).to.equal(200)
    expect(body).to.deep.include.members([
      {
        id: '1f3af974-7d4d-40b4-86a5-94a2241265cb',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'demand_b',
        transactionType: 'creation',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: 'd65d8e11-150f-4ea4-b778-b920e9dbc378',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'demand_b',
        transactionType: 'creation',
        submittedAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ])
  })

  it('returns 422 with invalid updatedSince', async () => {
    const { status, body } = await get(app, `/v1/transaction?updated_since=foo`)
    expect(status).to.equal(422)
    expect(body).to.contain({
      name: 'ValidateError',
      message: 'Validation failed',
    })
  })

  it('returns 422 when invalid type is passed', async () => {
    const { status, body } = await get(app, '/v1/transaction?apiType=notAType&status=submitted')

    expect(status).to.equal(422)
    expect(body).to.contain({
      name: 'ValidateError',
      message: 'Validation failed',
    })
  })

  it('returns 422 when invalid status is passed', async () => {
    const { status, body } = await get(app, '/v1/transaction?apiType=demand_b&status=notAStatus')

    expect(status).to.equal(422)
    expect(body).to.contain({
      name: 'ValidateError',
      message: 'Validation failed',
    })
  })
})
