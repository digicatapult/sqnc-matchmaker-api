import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server'
import { post } from '../../helper/routeHelper'
import { seed, cleanup, seededCapacityId, parametersAttachmentId } from '../../seeds'

import { withIdentitySelfMock } from '../../helper/mock'
import Database from '../../../src/lib/db'
import ChainNode from '../../../src/lib/chainNode'
import { logger } from '../../../src/lib/logger'
import env from '../../../src/env'
import { UUID } from '../../../src/models/strings'
import { pollTransactionState } from '../../helper/poll'

const db = new Database()
const node = new ChainNode({
  host: env.NODE_HOST,
  port: env.NODE_PORT,
  logger,
  userUri: env.USER_URI,
})

describe('on-chain', function () {
  this.timeout(60000)
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

  describe('capacity', () => {
    it('should create a capacity on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const response = await post(app, `/capacity/${seededCapacityId}/creation`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      // wait for block to finalise
      await pollTransactionState(db, transactionId, 'finalised')

      // check local capacity updates with token id
      const [capacity] = await db.getDemand(seededCapacityId)
      expect(capacity.latestTokenId).to.equal(lastTokenId + 1)
      expect(capacity.originalTokenId).to.equal(lastTokenId + 1)
    })
  })

  describe('order', () => {
    it('creates an order on chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      const {
        body: { id: orderId },
      } = await post(app, '/order', { parametersAttachmentId })

      // submit to chain
      const response = await post(app, `/order/${orderId}/creation`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      await pollTransactionState(db, transactionId, 'finalised')

      const [order] = await db.getDemand(orderId)
      expect(order).to.contain({
        id: orderId,
        state: 'created',
        subtype: 'order',
        parametersAttachmentId,
        latestTokenId: lastTokenId + 1,
        originalTokenId: lastTokenId + 1,
      })
    })
  })

  describe('match2', async () => {
    let orderOriginalId: number
    let capacityOriginalId: number
    let orderLocalId: UUID
    let capacityLocalId: UUID
    let match2LocalId: UUID

    beforeEach(async () => {
      // prepare an unallocated order + capacity + local match2

      const {
        body: { id: orderId },
      } = await post(app, '/order', { parametersAttachmentId })
      const {
        body: { id: orderTransactionId },
      } = await post(app, `/order/${orderId}/creation`, {})

      const {
        body: { id: capacityId },
      } = await post(app, '/capacity', { parametersAttachmentId })
      const {
        body: { id: capacityTransactionId },
      } = await post(app, `/capacity/${capacityId}/creation`, {})

      await pollTransactionState(db, orderTransactionId, 'finalised')
      const [order] = await db.getDemand(orderId)
      orderLocalId = orderId
      orderOriginalId = order.originalTokenId

      await pollTransactionState(db, capacityTransactionId, 'finalised')
      const [capacity] = await db.getDemand(capacityId)
      capacityLocalId = capacityId
      capacityOriginalId = capacity.originalTokenId

      const {
        body: { id: match2Id },
      } = await post(app, '/match2', { demandA: orderId, demandB: capacityId })
      match2LocalId = match2Id
    })

    it('should propose a match2 on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const response = await post(app, `/match2/${match2LocalId}/proposal`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      // wait for block to finalise
      await pollTransactionState(db, transactionId, 'finalised')

      // check local entities update with token id
      const [demandA] = await db.getDemand(orderLocalId)
      expect(demandA.latestTokenId).to.equal(lastTokenId + 1)
      expect(demandA.originalTokenId).to.equal(orderOriginalId)

      const [demandB] = await db.getDemand(capacityLocalId)
      expect(demandB.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandB.originalTokenId).to.equal(capacityOriginalId)

      const [match2] = await db.getMatch2(match2LocalId)
      expect(match2.latestTokenId).to.equal(lastTokenId + 3)
      expect(match2.originalTokenId).to.equal(lastTokenId + 3)
    })

    it('should acceptA then acceptFinal a match2 on-chain', async () => {
      // propose
      const proposal = await post(app, `/match2/${match2LocalId}/proposal`, {})

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      const [match2] = await db.getMatch2(match2LocalId)
      const match2OriginalId = match2.originalTokenId
      const lastTokenId = await node.getLastTokenId()

      // submit accept to chain
      const responseAcceptA = await post(app, `/match2/${match2LocalId}/accept`, {})
      expect(responseAcceptA.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')

      // check local entities update with token id
      const [match2AcceptA] = await db.getMatch2(match2LocalId)
      expect(match2AcceptA.latestTokenId).to.equal(lastTokenId + 1)
      expect(match2AcceptA.state).to.equal('acceptedA')
      expect(match2AcceptA.originalTokenId).to.equal(match2OriginalId)

      // submit 2nd accept to chain
      const responseAcceptFinal = await post(app, `/match2/${match2LocalId}/accept`, {})
      expect(responseAcceptFinal.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptFinal.body.id, 'finalised')

      // check local entities update with token id
      const [demandA] = await db.getDemand(orderLocalId)
      expect(demandA.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandA.state).to.equal('allocated')
      expect(demandA.originalTokenId).to.equal(orderOriginalId)

      const [demandB] = await db.getDemand(capacityLocalId)
      expect(demandB.latestTokenId).to.equal(lastTokenId + 3)
      expect(demandB.state).to.equal('allocated')
      expect(demandB.originalTokenId).to.equal(capacityOriginalId)

      const [matchAcceptFinal] = await db.getMatch2(match2LocalId)
      expect(matchAcceptFinal.latestTokenId).to.equal(lastTokenId + 4)
      expect(matchAcceptFinal.state).to.equal('acceptedFinal')
      expect(matchAcceptFinal.originalTokenId).to.equal(match2OriginalId)
    })
  })
})
