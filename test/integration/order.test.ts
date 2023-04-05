/* eslint disable */
import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { post, get } from '../helper/routeHelper'
import { seed, parametersAttachmentId, seededOrderId, seededOrderCreationId ,cleanup } from '../seeds'

import { DemandState } from '../../src/models/demand'
import { selfAlias, identitySelfMock, demandCreateMock } from '../helper/mock'
import { TransactionState } from '../../src/models/transaction'
import Database from '../../src/lib/db'

const db = new Database()

describe('order', () => {
  let res: any
  let app: Express

  before(async function () {
    app = await createHttpServer()
    identitySelfMock()
    demandCreateMock()
  })

  beforeEach(async () => await seed())

  describe('when requested order or orders do not exist', () => {
    beforeEach(async () => await cleanup())

    it ('returns 200 and an empty array when retrieving all', async () => {
      const { status, body } = await get(app, '/order')

      expect(status).to.equal(200)
      expect(body).to.be.an( "array" ).that.is.empty
    })

    it('returns 404 if can not be found by ID', async () => {
      const { status, body } = await get(app, '/order/807d1184-9670-4fb0-bb33-28582e5467b2')

      expect(status).to.equal(404)
      expect(body).to.equal('order not found')
    })
    // TODO - assert for max number of records 
  })

  describe('if attachment can not be found', () => {
    beforeEach(async () => {
      res = await post(app, '/order', { parametersAttachmentId: 'a789ad47-91c3-446e-90f9-a7c9b233ea88' })
    })

    it('returns 404 along with the message', () => {
      const { status, body } = res

      expect(status).to.equal(404)
      expect(body).to.equal('attachment not found')
    })
  })

  describe('if invalid order uuid', () => {
    beforeEach(async () => {
      res = await get(app, '/order/789ad47')
    })

    it('returns 422 along with validation error', async () => {
      const { status, body } = res

      expect(status).to.equal(422)
      expect(body).to.deep.contain({
        fields: {
          'orderId': {
            message:
              "Not match in '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}'",
            value: '789ad47',
          },
        },
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })
  })

  describe('if invalid attachment uuid', () => {
    beforeEach(async () => {
      res = await post(app, '/order', { parametersAttachmentId: 'a789ad47' })
    })

    it('returns 422 along with validation error', () => {
      const { status, body } = res

      expect(status).to.equal(422)
      expect(body).to.deep.contain({
        fields: {
          '.parametersAttachmentId': {
            message:
              "Not match in '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}'",
            value: 'a789ad47',
          },
        },
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })
  })

  it('retrieves order by id', async () => {
    const { status, body } = await post(app, '/order', { parametersAttachmentId })

    expect(status).to.equal(201)
    expect(body).to.have.property('id')
    expect(body).to.deep.contain({
      owner: 'test-self',
      state: 'created',
      parametersAttachmentId: 'a789ad47-91c3-446e-90f9-a7c9b233eaf8'
    })
  })

  it('should create an order demand', async () => {
    const response = await post(app, '/order', { parametersAttachmentId })
    const { id: responseId, ...responseRest } = response.body

    expect(response.status).to.equal(201)
    expect(responseId).to.match(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    )
    expect(responseRest).to.deep.equal({
      parametersAttachmentId,
      state: DemandState.created,
      owner: selfAlias,
    })
  })

  it('creates an order transaction on chain', async () => {
    const { body: { id: orderId } } = await post(app, '/order', { parametersAttachmentId })

    // submit to chain
    const response = await post(app, `/order/${orderId}/creation`, {})
    expect(response.status).to.equal(201)

    const { id: transactionId, state } = response.body
    expect(transactionId).to.match(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    )
    expect(state).to.equal(TransactionState.submitted)

    // check local transaction updates
    const [transaction] = await db.getTransaction(transactionId)
    expect(transaction.state).to.equal(TransactionState.finalised)
    expect(transaction).to.contain({
      state: 'finalised',
      apiType: 'order',
      transactionType: 'creation',
    })

    const [order] = await db.getDemand(orderId)
    expect(transaction.localId).to.equal(orderId)
    expect(order).to.contain({
      id: orderId,
      state: 'created',
      subtype: 'order',
      parametersAttachmentId,
    })
  })

  it('retrieves order creation', async () => {
    const { status, body: creation } = await get(app, `/order/${seededOrderId}/creation/${seededOrderCreationId}`)

    expect(status).to.equal(200)
    expect(creation).to.include.keys(['id', 'localId', 'submittedAt', 'updatedAt'])
    expect(creation).to.contain({
      state: 'submitted',
      apiType: 'order',
      transactionType: 'creation',
    })
  })
})
