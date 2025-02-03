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
import { get, post } from '../test/helper/routeHelper'
import { seed, cleanup, parametersAttachmentId } from '../test/seeds/onchainSeeds/onchain.match2.seed'
import { getToken } from './parallelHandlingHelper/routeHelper.js'

describe('on-chain', function () {
  let token: string = ''
  this.timeout(60000)
  const db = new Database()
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer; endpoint: string } = {} as {
    app: Express
    indexer: Indexer
    endpoint: `http://sqnc-matchmaker-api:3000`
  }

  const endpoint = `http://sqnc-matchmaker-api:3000`

  // eventually remove this
  // but still need to work out how to force the indexer into particular state before each test
  withAppAndIndexer(context)

  withIdentitySelfMock()

  beforeEach(async function () {
    await seed()
    token = await getToken()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('parallel demandAs', () => {
    it('creates many demandAs on chain in parallel', async function () {
      const numberDemands = 500

      const demandIds = await Promise.allSettled(
        Array(numberDemands)
          .fill(null)
          .map(async () => {
            const res = await fetch(`${endpoint}/v1/demandA`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                authorization: `bearer ${token}`,
              },
              body: JSON.stringify({ parametersAttachmentId: parametersAttachmentId }),
            })
            const data = await res.json()
            expect(res.status).to.equal(201)
            if (!data.id) {
              throw new Error(`no demandA id`)
            }
            return data.id as string
          })
      )
      console.log('after 1st fetch')
      const fulfilledDemandIds = demandIds
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
      // console.log('demandA Ids fulfilled:', fulfilledDemandIds)
      const rejectedDemandIds = demandIds
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      // console.log('demandA Ids rejected :', rejectedDemandIds)

      const transactionIds = await Promise.allSettled(
        fulfilledDemandIds.map(async (demandAId) => {
          const response = await fetch(`${endpoint}/v1/demandA/${demandAId}/creation`, {
            method: 'POST',
            headers: {
              authorization: `bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          })
          const data = await response.json()
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = data
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')

          return transactionId as string
        })
      )
      console.log('after 2nd fetch')
      const fulfilledTransactions = transactionIds
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
      // console.log('transactions Ids fulfilled:', fulfilledTransactions)
      const rejectedTransactions = transactionIds
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      // console.log('transactions Ids rejected :', rejectedTransactions)

      await node.sealBlock()
      console.log('before finalised transactions')
      const finalisedTransactions = await Promise.allSettled(
        fulfilledTransactions.map(async (tx) => {
          await pollTransactionState(db, tx, 'finalised')
        })
      )
      const rejectedFinalisedTransactions = finalisedTransactions
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedTransactions.length > 0) {
        console.log(rejectedFinalisedTransactions)
        throw new Error('finalised transactions rejected ')
      }
      console.log('before demads with created state')
      const demandsWithCreatedState = await Promise.allSettled(
        fulfilledDemandIds.map(async (demand) => {
          await pollDemandState(db, demand, 'created', 500, 100)

          const [demandA] = await db.getDemand(demand)
          expect(demandA).to.contain({
            id: demand,
            state: 'created',
            subtype: 'demand_a',
            parametersAttachmentId,
          })
        })
      )
      const rejectedDemandsWithCreatedState = demandsWithCreatedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedDemandsWithCreatedState.length > 0) {
        console.log(rejectedDemandsWithCreatedState)
        throw new Error('demands that failed to reach state created ')
      }
    })

    it('comment on many demandAs on chain in parallel', async function () {
      const numberDemands = 500

      const demandIds = await Promise.all(
        Array(numberDemands)
          .fill(null)
          .map(async () => {
            const {
              status,
              body: { id: demandAId },
            } = await post(context.app, `${context.endpoint}/v1/demandA`, { parametersAttachmentId })
            expect(status).to.equal(201)
            return demandAId as string
          })
      )

      const transactionIds = await Promise.all(
        demandIds.map(async (demandAId) => {
          const response = await post(context.app, `${context.endpoint}/v1/demandA/${demandAId}/creation`, {})
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
            subtype: 'demand_a',
            parametersAttachmentId,
          })
        })
      )
      const commentResponses = await Promise.all(
        demandIds.map(async (demandAId) => {
          const commentResponse = await post(context.app, `${context.endpoint}/v1/demandA/${demandAId}/comment`, {
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
