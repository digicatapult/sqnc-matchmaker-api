import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import { container } from 'tsyringe'
import ChainNode from '../src/lib/chainNode'
import Database from '../src/lib/db'
import Indexer from '../src/lib/indexer'
import { withAppAndIndexer } from '../test/helper/chainTest'
import { withIdentitySelfMock, selfAddress } from '../test/helper/mock'
import { pollTransactionState, pollDemandState, pollDemandCommentState } from '../test/helper/poll'
import { post } from '../test/helper/routeHelper'
import { seed, cleanup, parametersAttachmentId } from '../test/seeds/onchainSeeds/onchain.match2.seed'

describe.skip('on-chain', function () {
  this.timeout(60000)
  const db = new Database()
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }

  withAppAndIndexer(context)

  withIdentitySelfMock()

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('parallel demandBs', () => {
    it('creates many demandBs on chain in parallel', async function () {
      const numberDemands = 500

      const demandIds = await Promise.all(
        Array(numberDemands)
          .fill(null)
          .map(async () => {
            const {
              status,
              body: { id: demandBId },
            } = await post(context.app, '/v1/demandB', { parametersAttachmentId })
            expect(status).to.equal(201)
            return demandBId as string
          })
      )

      const transactionIds = await Promise.all(
        demandIds.map(async (demandBId) => {
          const response = await post(context.app, `/v1/demandB/${demandBId}/creation`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')

          return transactionId as string
        })
      )

      await node.sealBlock()

      await Promise.all(
        transactionIds.map(async (tx) => {
          await pollTransactionState(db, tx, 'finalised')
        })
      )

      await Promise.all(
        demandIds.map(async (demand) => {
          await pollDemandState(db, demand, 'created', 500, 100)

          const [demandB] = await db.getDemand(demand)
          expect(demandB).to.contain({
            id: demand,
            state: 'created',
            subtype: 'demand_b',
            parametersAttachmentId,
          })
        })
      )
    })

    it('comment on many demandBs on chain in parallel', async function () {
      const numberDemands = 500

      const demandIds = await Promise.all(
        Array(numberDemands)
          .fill(null)
          .map(async () => {
            const {
              status,
              body: { id: demandBId },
            } = await post(context.app, '/v1/demandB', { parametersAttachmentId })
            expect(status).to.equal(201)
            return demandBId as string
          })
      )

      const transactionIds = await Promise.all(
        demandIds.map(async (demandBId) => {
          const response = await post(context.app, `/v1/demandB/${demandBId}/creation`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')

          return transactionId as string
        })
      )

      await node.sealBlock()

      await Promise.all(
        transactionIds.map(async (tx) => {
          await pollTransactionState(db, tx, 'finalised')
        })
      )

      await Promise.all(
        demandIds.map(async (demand) => {
          await pollDemandState(db, demand, 'created', 500, 100)

          const [demandA] = await db.getDemand(demand)
          expect(demandA).to.contain({
            id: demand,
            state: 'created',
            subtype: 'demand_b',
            parametersAttachmentId,
          })
        })
      )
      const commentResponses = await Promise.all(
        demandIds.map(async (demandBId) => {
          const commentResponse = await post(context.app, `/v1/demandB/${demandBId}/comment`, {
            attachmentId: parametersAttachmentId,
          })
          expect(commentResponse.status).to.equal(201)
          return commentResponse.body.id as string
        })
      )
      await node.sealBlock()

      await Promise.all(
        commentResponses.map(async (commentResponseId) => {
          await pollTransactionState(db, commentResponseId, 'finalised')
          await pollDemandCommentState(db, commentResponseId, 'created')
          const [maybeComment] = await db.getDemandCommentForTransaction(commentResponseId)
          if (!maybeComment) {
            expect.fail('Expected comment to be in db')
          }
          const { id, createdAt, ...comment } = maybeComment
          expect(comment).to.deep.equal({
            owner: selfAddress,
            attachmentId: parametersAttachmentId,
            state: 'created',
          })
        })
      )
    })
  })
})
