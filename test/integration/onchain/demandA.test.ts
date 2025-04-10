import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { post } from '../../helper/routeHelper.js'
import { seed, cleanup, seededDemandAId } from '../../seeds/onchainSeeds/demandA.seed.js'

import {
  MockDispatcherContext,
  parametersAttachmentId,
  selfAddress,
  withAttachmentMock,
  withDispatcherMock,
  withIdentitySelfMock,
} from '../../helper/mock.js'
import Database from '../../../src/lib/db/index.js'
import { pollTransactionState, pollDemandState, pollDemandCommentState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { container } from 'tsyringe'
import { filterRejectedAndAcceptedPromises } from '../../helper/parallelTests.js'
import { withProxy } from '../../helper/proxy.js'
import ExtendedChainNode from '../../helper/testInstanceChainNode.js'
import env from '../../../src/env.js'
import { logger } from '../../../src/lib/logger.js'
import { DemandRow } from '../../../src/lib/db/types.js'

describe('on-chain', function () {
  this.timeout(80000)
  const db = container.resolve(Database)
  const node = new ExtendedChainNode(logger, env)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }
  const mock: MockDispatcherContext = {} as MockDispatcherContext

  withAppAndIndexer(context)

  withDispatcherMock(mock)
  withIdentitySelfMock(mock)
  withAttachmentMock(mock)
  withProxy(node)

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('demandA', () => {
    it('creates a demandA on chain', async () => {
      const lastTokenId = await node.getLastTokenId()
      const {
        body: { id: demandAId },
      } = await post(context.app, '/v1/demandA', { parametersAttachmentId })
      // submit to chain
      const response = await post(context.app, `/v1/demandA/${demandAId}/creation`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      await node.clearAllTransactions()
      await pollTransactionState(db, transactionId, 'finalised')
      await pollDemandState(db, demandAId, 'created')

      const [demandA] = await db.get('demand', { id: demandAId })
      expect(demandA).to.contain({
        id: demandAId,
        state: 'created',
        subtype: 'demand_a',
        parameters_attachment_id: parametersAttachmentId,
        latest_token_id: lastTokenId + 1,
        original_token_id: lastTokenId + 1,
      })
    })

    it('creates a demandA on chain - scope', async () => {
      const {
        body: { id: demandAId },
      } = await post(context.app, '/v1/demandA', { parametersAttachmentId })
      const { status } = await post(context.app, `/v1/demandA/${demandAId}/creation`, {}, {}, `demandA:create`)
      expect(status).to.equal(201)
    })

    it('creates many demandAs on chain in parallel', async function () {
      const numberDemands = 50

      const demandIds = await Promise.allSettled(
        Array(numberDemands)
          .fill(null)
          .map(async () => {
            const res = await post(context.app, '/v1/demandA', { parametersAttachmentId })
            expect(res.status).to.equal(201)
            if (!res.body.id) {
              throw new Error(`no demandA id`)
            }
            return res.body.id as string
          })
      )
      const [fulfilledDemandIds, rejectedDemandIds] = await filterRejectedAndAcceptedPromises(demandIds)
      if (rejectedDemandIds.length > 0) {
        throw new Error(`${rejectedDemandIds.length} demand As were rejected with Error: ${rejectedDemandIds[0]}`)
      }

      const transactionIds = await Promise.allSettled(
        fulfilledDemandIds.map(async (demandAId) => {
          const response = await post(context.app, `/v1/demandA/${demandAId}/creation`, {})
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
          `${rejectedTransactions.length} remand A creations were rejected with Error: ${rejectedTransactions[0]}`
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

          const [demandA] = await db.get('demand', { id: demand })
          expect(demandA).to.contain({
            id: demand,
            state: 'created',
            subtype: 'demand_a',
            parameters_attachment_id: parametersAttachmentId,
          })
        })
      )
      const rejectedDemandsWithCreatedState = demandsWithCreatedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedDemandsWithCreatedState.length > 0) {
        throw new Error(`demands that failed to reach state created ${rejectedDemandsWithCreatedState.length}`)
      }
    })

    it('should comment on a demandA on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const creationResponse = await post(context.app, `/v1/demandA/${seededDemandAId}/creation`, {})
      expect(creationResponse.status).to.equal(201)
      // wait for block to finalise
      await node.clearAllTransactions()
      await pollTransactionState(db, creationResponse.body.id, 'finalised')
      await pollDemandState(db, seededDemandAId, 'created')

      // submit to chain
      const commentResponse = await post(context.app, `/v1/demandA/${seededDemandAId}/comment`, {
        attachmentId: parametersAttachmentId,
      })
      expect(commentResponse.status).to.equal(201)

      const transactionId = commentResponse.body.id

      // wait for block to finalise
      await node.clearAllTransactions()
      await pollTransactionState(db, transactionId, 'finalised')
      await pollDemandCommentState(db, transactionId, 'created')

      // check local demandA updates with token id
      const [maybeDemandB] = await db.get('demand', { id: seededDemandAId })
      const demandA = maybeDemandB as DemandRow
      expect(demandA.latest_token_id).to.equal(lastTokenId + 2)
      expect(demandA.original_token_id).to.equal(lastTokenId + 1)

      const [maybeComment] = await db.get('demand_comment', { transaction_id: transactionId })
      if (!maybeComment) {
        expect.fail('Expected comment to be in db')
      }
      const { id, created_at, updated_at, ...comment } = maybeComment
      expect(comment).to.deep.equal({
        owner: selfAddress,
        attachment_id: parametersAttachmentId,
        state: 'created',
        demand: seededDemandAId,
        transaction_id: transactionId,
      })
    })

    it('should comment on a demandA on-chain - scope', async () => {
      const creationResponse = await post(context.app, `/v1/demandA/${seededDemandAId}/creation`, {})
      expect(creationResponse.status).to.equal(201)
      await node.clearAllTransactions()
      await pollTransactionState(db, creationResponse.body.id, 'finalised')
      await pollDemandState(db, seededDemandAId, 'created')

      const { status } = await post(
        context.app,
        `/v1/demandA/${seededDemandAId}/comment`,
        {
          attachmentId: parametersAttachmentId,
        },
        {},
        `demandA:comment`
      )
      expect(status).to.equal(201)
    })

    it('comment on many demandAs on chain in parallel', async function () {
      const numberDemands = 50

      const demandIds = await Promise.allSettled(
        Array(numberDemands)
          .fill(null)
          .map(async () => {
            const {
              status,
              body: { id: demandAId },
            } = await post(context.app, '/v1/demandA', { parametersAttachmentId })

            expect(status).to.equal(201)
            return demandAId as string
          })
      )
      const [fulfilledDemandIds, rejectedDemandIds] = await filterRejectedAndAcceptedPromises(demandIds)
      if (rejectedDemandIds.length > 0) {
        throw new Error(`${rejectedDemandIds.length} remand As were rejected with Error: ${rejectedDemandIds[0]}`)
      }

      const transactionIds = await Promise.allSettled(
        fulfilledDemandIds.map(async (demandAId) => {
          const response = await post(context.app, `/v1/demandA/${demandAId}/creation`, {})
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
        throw new Error(`${rejectedTransactions.length} finalised transactions rejected ${rejectedTransactions}`)
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

          const [demandA] = await db.get('demand', { id: demand })
          expect(demandA).to.contain({
            id: demand,
            state: 'created',
            subtype: 'demand_a',
            parameters_attachment_id: parametersAttachmentId,
          })
        })
      )
      const commentResponses = await Promise.allSettled(
        fulfilledDemandIds.map(async (demandAId) => {
          const commentResponse = await post(context.app, `/v1/demandA/${demandAId}/comment`, {
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
          const [maybeComment] = await db.get('demand_comment', { transaction_id: commentResponseId })
          if (!maybeComment) {
            expect.fail('Expected comment to be in db')
          }
          const { id, created_at, updated_at, ...comment } = maybeComment
          expect(comment).to.deep.equal({
            owner: selfAddress,
            attachment_id: parametersAttachmentId,
            state: 'created',
            demand: comment.demand,
            transaction_id: commentResponseId,
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
