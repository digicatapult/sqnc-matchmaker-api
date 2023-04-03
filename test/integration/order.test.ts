/* eslint disable */
import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { post } from '../helper/routeHelper'
import { seed, parametersAttachmentId, cleanup } from '../seeds'

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
  })

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
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

  it('should create a order demand', async () => {
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
    demandCreateMock()
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

    // check local capacity updates with token id
    const [order] = await db.getDemand(orderId)
    expect(order).to.contain({
      id: orderId,
      owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      state: 'created',
      subtype: 'order',
      parametersAttachmentId,
    })
  })
})
