import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { post } from '../../helper/routeHelper.js'
import { seed, cleanup, seededDemandBId, parametersAttachmentId } from '../../seeds/onchainSeeds/demandB.seed.js'
import { selfAddress, withIdentitySelfMock } from '../../helper/mock.js'
import Database, { DemandRow } from '../../../src/lib/db/index.js'
import ChainNode from '../../../src/lib/chainNode.js'
import { pollDemandCommentState, pollDemandState, pollTransactionState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { container } from 'tsyringe'
import { filterRejectedAndAcceptedPromises } from '../../helper/parallelTests.js'
import { withProxy } from '../../helper/proxy.js'

describe.only('on-chain', function () {
  this.timeout(60000)
  const db = new Database()
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }

  withAppAndIndexer(context)

  withIdentitySelfMock()
  withProxy(node)

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('demandB', () => {
    it('should create a demandB on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const response = await post(context.app, `/v1/demandB/${seededDemandBId}/creation`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, transactionId, 'finalised')
      await pollDemandState(db, seededDemandBId, 'created')

      // check local demandB updates with token id
      const [maybeDemandB] = await db.getDemand(seededDemandBId)
      const demandB = maybeDemandB as DemandRow
      expect(demandB.latestTokenId).to.equal(lastTokenId + 1)
      expect(demandB.originalTokenId).to.equal(lastTokenId + 1)
    })

    it('creates many demandBs on chain in parallel', async function () {
      const numberDemands = 50

      const demandIds = await Promise.allSettled(
        Array(numberDemands)
          .fill(null)
          .map(async () => {
            const res = await post(context.app, '/v1/demandB', { parametersAttachmentId })
            expect(res.status).to.equal(201)
            if (!res.body.id) {
              throw new Error(`no demandB id`)
            }
            return res.body.id as string
          })
      )
      const [fulfilledDemandIds, rejectedDemandIds] = await filterRejectedAndAcceptedPromises(demandIds)
      if (rejectedDemandIds.length > 0) {
        throw new Error(`${rejectedDemandIds.length} demand Bs were rejected with Error: ${rejectedDemandIds[0]}`)
      }

      const transactionIds = await Promise.allSettled(
        fulfilledDemandIds.map(async (demandBId) => {
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

      const [fulfilledTransactions, rejectedTransactions] = await filterRejectedAndAcceptedPromises(transactionIds)
      if (rejectedTransactions.length > 0) {
        throw new Error(
          `${rejectedTransactions.length} remand B creations were rejected with Error: ${rejectedTransactions[0]}`
        )
      }

      await node.clearAllTransactions()
      const finalisedTransactions = await Promise.allSettled(
        fulfilledTransactions.map(async (tx) => {
          await pollTransactionState(db, tx, 'finalised')
        })
      )
      const rejectedFinalisedTransactions = finalisedTransactions
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedTransactions.length > 0) {
        throw new Error('finalised transactions rejected ')
      }
      const demandsWithCreatedState = await Promise.allSettled(
        fulfilledDemandIds.map(async (demand) => {
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
      const rejectedDemandsWithCreatedState = demandsWithCreatedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedDemandsWithCreatedState.length > 0) {
        throw new Error(`demands B that failed to reach state created ${rejectedDemandsWithCreatedState.length}`)
      }
    })

    it('should comment on a demandB on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const creationResponse = await post(context.app, `/v1/demandB/${seededDemandBId}/creation`, {})
      expect(creationResponse.status).to.equal(201)
      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, creationResponse.body.id, 'finalised')
      await pollDemandState(db, seededDemandBId, 'created')

      // submit to chain
      const commentResponse = await post(context.app, `/v1/demandB/${seededDemandBId}/comment`, {
        attachmentId: parametersAttachmentId,
      })
      expect(commentResponse.status).to.equal(201)
      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, commentResponse.body.id, 'finalised')
      await pollDemandCommentState(db, commentResponse.body.id, 'created')

      // check local demandB updates with token id
      const [maybeDemandB] = await db.getDemand(seededDemandBId)
      const demandB = maybeDemandB as DemandRow
      expect(demandB.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandB.originalTokenId).to.equal(lastTokenId + 1)

      const [maybeComment] = await db.getDemandCommentForTransaction(commentResponse.body.id)
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

    it('comment on many demandBs on chain in parallel', async function () {
      const numberDemands = 50

      const demandIds = await Promise.allSettled(
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
      const [fulfilledDemandIds, rejectedDemandIds] = await filterRejectedAndAcceptedPromises(demandIds)
      if (rejectedDemandIds.length > 0) {
        throw new Error(`${rejectedDemandIds.length} remand Bs were rejected with Error: ${rejectedDemandIds[0]}`)
      }

      const transactionIds = await Promise.allSettled(
        fulfilledDemandIds.map(async (demandBId) => {
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
      await node.clearAllTransactions()
      const [fulfilledTransactions, rejectedTransactions] = await filterRejectedAndAcceptedPromises(transactionIds)
      if (rejectedTransactions.length > 0) {
        throw new Error(`finalised transactions rejected ${rejectedTransactions}`)
      }

      const finalisedTransactions = await Promise.allSettled(
        fulfilledTransactions.map(async (tx) => {
          await pollTransactionState(db, tx, 'finalised')
        })
      )
      const rejectedFinalisedTransactions = finalisedTransactions
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedTransactions.length > 0) {
        throw new Error(
          `${rejectedFinalisedTransactions.length} finalised transactions rejected with error: ${rejectedFinalisedTransactions[0]}`
        )
      }
      await Promise.allSettled(
        fulfilledDemandIds.map(async (demand) => {
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
      const commentResponses = await Promise.allSettled(
        fulfilledDemandIds.map(async (demandBId) => {
          const commentResponse = await post(context.app, `/v1/demandB/${demandBId}/comment`, {
            attachmentId: parametersAttachmentId,
          })
          expect(commentResponse.status).to.equal(201)
          return commentResponse.body.id as string
        })
      )
      await node.clearAllTransactions()
      const [fulfilledCommentResponses, rejectedCommentResponses] =
        await filterRejectedAndAcceptedPromises(commentResponses)
      if (rejectedCommentResponses.length > 0) {
        throw new Error(
          `${rejectedCommentResponses.length} comment responses that were rejected ${rejectedCommentResponses}`
        )
      }

      const commentResponsesChecked = await Promise.allSettled(
        fulfilledCommentResponses.map(async (commentResponseId) => {
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
      const rejectedResponsesChecked = commentResponsesChecked
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedResponsesChecked.length > 0) {
        throw new Error(
          `${rejectedResponsesChecked.length} number of comment responses that failed to reach state created ${rejectedResponsesChecked.length} with error:${rejectedResponsesChecked[0]}`
        )
      }
    })
  })
})
