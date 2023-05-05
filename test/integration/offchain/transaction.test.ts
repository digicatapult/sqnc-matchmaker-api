import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server'
import { get } from '../../helper/routeHelper'
import { seed, cleanup, nonExistentId } from '../../seeds'

describe('transaction', () => {
  let app: Express

  before(async function () {
    app = await createHttpServer()
  })

  beforeEach(async function () {
    await seed()
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
    cleanup()
    const { status, body } = await get(app, '/v1/transaction')

    expect(status).to.equal(200)
    expect(body).to.be.an('array').that.is.empty
  })

  it('also returns an empty array if 0 transactions found by type', async () => {
    cleanup()
    const { status, body } = await get(app, '/v1/transaction?apiType=demand_a')

    expect(status).to.equal(200)
    expect(body).to.be.an('array').that.is.empty
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

  // TODO assert for limit (when set on the db)
  it('returns all transactions', async () => {
    const { status, body } = await get(app, '/v1/transaction')

    // TODO create a fixtures
    expect(status).to.equal(200)
    expect(body.length).to.equal(5)
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
