import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { get } from '../helper/routeHelper'
import {
  seed,
  cleanup,
  seededCapacityId,
  nonExistentId,
  seededTransactionId4,
  exampleDate,
} from '../seeds'
import { TransactionState, TransactionApiType, TransactionType } from '../../src/models/transaction'

describe.only('transaction', () => {
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
    it('returns 400 along with validation error', async () => {
      const { status, body } = await get(app, '/transaction/123-not-uuid')

      expect(status).to.equal(422)
      expect(body).to.deep.contain({
        fields: {
          transactionId: {
            message: "Not match in '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}'",
            value: '123-not-uuid'
          }
        },
        status: 400,
        name: 'ValidateError',
        message: 'Validation failed'
      })
    })
  })

  describe('when requested transaction can not be found', () => {
    it('returns 404 along with the message', async () => {
      const { status, body } = await get(app, `/transaction/${nonExistentId}`)

      expect(status).to.equal(404)
      expect(body).to.equal('transaction not found')
    })
  })

  it('returns empty array if database contains 0 transactions', async () => {
    cleanup()
    const { status, body } = await get(app, '/transaction')

    expect(status).to.equal(200)
    expect(body).to.be.an('array').that.is.empty
  })


  it('gets transaction by id', async () => {
    const response = await get(app, `/transaction/${seededTransactionId4}`)

    expect(response.status).to.equal(200)
    expect(response.body).to.deep.contain({
        id: seededTransactionId4,
        apiType: TransactionApiType.order,
        transactionType: TransactionType.creation,
        localId: seededCapacityId,
        state: TransactionState.submitted,
        submittedAt: exampleDate,
        updatedAt: exampleDate,
      })
  })

  // TODO assert for limit (when set on the db)
  it('returns all transactions', async () => {
    const { status, body } = await get(app, '/transaction')

    expect(status).to.equal(200)
    expect(body.length).to.equal(5)
    expect(body).to.deep.include.members([
      {
        id: '1eb872bd-1bbe-4a8b-9484-95644b88fea4',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'capacity',
        transactionType: 'creation',
        submittedAt: '2023-03-24T10:40:47.317Z',
        updatedAt: '2023-03-24T10:40:47.317Z'
      },
      {
        id: 'd65d8e11-150f-4ea4-b778-b920e9dbc378',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'capacity',
        transactionType: 'creation',
        submittedAt: '2023-03-24T10:40:47.317Z',
        updatedAt: '2023-03-24T10:40:47.317Z'
      },
      {
        id: '8a5343dc-88a3-4b61-b156-330d52f506f8',
        state: 'submitted',
        localId: 'f960e4a1-6182-4dd3-8ac2-6f3fad995551',
        apiType: 'match2',
        transactionType: 'proposal',
        submittedAt: '2023-03-24T10:40:47.317Z',
        updatedAt: '2023-03-24T10:40:47.317Z'
      },
      {
        id: '33e0fa14-9495-42bd-acfb-e82a8c8d4a29',
        state: 'submitted',
        localId: 'f960e4a1-6182-4dd3-8ac2-6f3fad995551',
        apiType: 'match2',
        transactionType: 'accept',
        submittedAt: '2023-03-24T10:40:47.317Z',
        updatedAt: '2023-03-24T10:40:47.317Z'
      },
      {
        id: '54b78a1a-c7f7-4503-aa75-8bf91501c0be',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'order',
        transactionType: 'creation',
        submittedAt: '2023-03-24T10:40:47.317Z',
        updatedAt: '2023-03-24T10:40:47.317Z',
      }
    ])
  })

  it('returns transactions by type', async () => {
    const { status, body }= await get(app, '/transaction?apiType=order')

    expect(status).to.equal(200)
    expect(body).to.deep.include.members([
      {
        id: '54b78a1a-c7f7-4503-aa75-8bf91501c0be',
        state: 'submitted',
        localId: '0f5af074-7d4d-40b4-86a5-17a2391303cb',
        apiType: 'order',
        transactionType: 'creation',
        submittedAt: '2023-03-24T10:40:47.317Z',
        updatedAt: '2023-03-24T10:40:47.317Z'
      }
    ])
  })
})