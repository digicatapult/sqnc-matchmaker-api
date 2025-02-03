import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { post, get } from '../../helper/routeHelper.js'
import { seed, cleanup, parametersAttachmentId } from '../../seeds/onchainSeeds/onchain.match2.seed.js'
import { withIdentitySelfMock } from '../../helper/mock.js'
import Database, { DemandRow, Match2Row } from '../../../src/lib/db/index.js'
import ChainNode from '../../../src/lib/chainNode.js'
import { pollDemandState, pollMatch2State, pollTransactionState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { UUID } from '../../../src/models/strings.js'
import { container } from 'tsyringe'
import {
  filterRejectedAndAcceptedPromises,
  filterRejectedAndAcceptedPromisesForMatch2,
} from '../../helper/parallelTests.js'

describe('on-chain', function () {
  this.timeout(180000)
  const db = new Database()
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }

  withAppAndIndexer(context)
  withIdentitySelfMock()

  beforeEach(async () => await seed())
  afterEach(async () => await cleanup())

  describe.only('match2', async () => {
    let match2Ids: PromiseSettledResult<string>[] = []
    let demandAIds: PromiseSettledResult<{
      originalDemandA: number
      demandA: string
      transactionId: any
    }>[] = []
    let demandBIds: PromiseSettledResult<{
      originalDemandB: number
      demandB: string
      transactionId: any
    }>[] = []
    let fulfilledMatch2s: string[] = []
    let rejectedMatch2s: any[] = []
    let fulfilledDemandAIds: {
      originalDemandA: number
      demandA: string
      transactionId: any
    }[] = []
    let rejectedDemandAIds: any[] = []
    let fulfilledDemandBIds: {
      originalDemandB: number
      demandB: string
      transactionId: any
    }[] = []
    let rejectedDemandBIds: any[] = []

    beforeEach(async () => {
      const numberIds = 200

      demandAIds = await Promise.allSettled(
        Array(numberIds)
          .fill(null)
          .map(async () => {
            const {
              body: { id: demandAId },
            } = await post(context.app, '/v1/demandA', { parametersAttachmentId })
            const {
              body: { id: demandATransactionId },
            } = await post(context.app, `/v1/demandA/${demandAId}/creation`, {})
            const [demandA]: DemandRow[] = await db.getDemand(demandAId)

            return {
              originalDemandA: demandA.originalTokenId as number,
              demandA: demandAId as string,
              transactionId: demandATransactionId,
            }
          })
      )
      await node.clearAllTransactions()
      const filteredDemandAIds = await filterRejectedAndAcceptedPromisesForMatch2(demandAIds)
      fulfilledDemandAIds = filteredDemandAIds[0]
      rejectedDemandAIds = filteredDemandAIds[1]
      if (rejectedDemandAIds.length > 0) {
        throw new Error(`${rejectedDemandAIds.length} demand As were rejected with Error: ${rejectedDemandAIds[0]}`)
      }
      //check demand and transaction state
      for (const demandA of fulfilledDemandAIds) {
        await pollTransactionState(db, demandA.transactionId, 'finalised')
        await pollDemandState(db, demandA.demandA, 'created')
      }

      demandBIds = await Promise.allSettled(
        Array(numberIds)
          .fill(null)
          .map(async () => {
            const {
              body: { id: demandBId },
            } = await post(context.app, '/v1/demandB', { parametersAttachmentId })
            const {
              body: { id: demandBTransactionId },
            } = await post(context.app, `/v1/demandB/${demandBId}/creation`, {})

            const [demandB]: DemandRow[] = await db.getDemand(demandBId)

            return {
              originalDemandB: demandB.originalTokenId as number,
              demandB: demandBId as string,
              transactionId: demandBTransactionId,
            }
          })
      )
      await node.clearAllTransactions()
      const filteredDemandBIds = await filterRejectedAndAcceptedPromisesForMatch2(demandBIds)
      fulfilledDemandBIds = filteredDemandBIds[0]
      rejectedDemandBIds = filteredDemandBIds[1]
      if (rejectedDemandBIds.length > 0) {
        throw new Error(`${rejectedDemandBIds.length} demand Bs were rejected with Error: ${rejectedDemandBIds[0]}`)
      }
      //check demand and transaction state
      for (const demandB of fulfilledDemandBIds) {
        await pollTransactionState(db, demandB.transactionId, 'finalised')
        await pollDemandState(db, demandB.demandB, 'created')
      }

      // check we have equal number of demandAs and demandBs
      if (fulfilledDemandAIds.length !== fulfilledDemandBIds.length) {
        console.log(`demandAs: ${fulfilledDemandAIds.length}`)
        console.log(`demandBs: ${fulfilledDemandBIds.length}`)

        throw new Error('Mismatch between demand A and demand B lengths')
      }

      match2Ids = await Promise.allSettled(
        fulfilledDemandAIds.map(async (demandA, index) => {
          const demandB = fulfilledDemandBIds[index]
          const {
            body: { id: match2Id },
          } = await post(context.app, '/v1/match2', { demandA: demandA.demandA, demandB: demandB.demandB })
          return match2Id as UUID
        })
      )
      await node.clearAllTransactions()
      const match2sFilteredRes = await filterRejectedAndAcceptedPromises(match2Ids)
      fulfilledMatch2s = match2sFilteredRes[0]
      rejectedMatch2s = match2sFilteredRes[1]

      if (rejectedMatch2s.length > 0) {
        throw new Error(`${rejectedMatch2s.length} prepared match2s rejected ${rejectedMatch2s}`)
      }
      // check we have correct number of match2s
      if (fulfilledMatch2s.length !== numberIds) {
        throw new Error(`We do not have correct number of match2s, length: ${fulfilledMatch2s.length}`)
      }
    })

    it.only('should propose many match2s on-chain', async () => {
      const transactionIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/proposal`, {})
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
        throw new Error(
          `${rejectedTransactions.length} match2 proposals rejected with error: ${rejectedTransactions[0]}`
        )
      }
      const finalisedMatch2Transactions = await Promise.allSettled(
        fulfilledTransactions.map(async (tx) => {
          await pollTransactionState(db, tx, 'finalised')
        })
      )
      const rejectedFinalisedTransactions = finalisedMatch2Transactions
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedTransactions.length > 0) {
        throw new Error(
          `${rejectedFinalisedTransactions.length} finalised transactions rejected with error: ${rejectedFinalisedTransactions[0]}`
        )
      }

      const proposedMatch2s = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed')
        })
      )
      const rejectedProposedMatch2s = proposedMatch2s
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedProposedMatch2s.length > 0) {
        throw new Error(
          `${rejectedProposedMatch2s.length} proposed match2s rejected with error: ${rejectedProposedMatch2s[0]}`
        )
      }

      const proposedLocalMatch2s = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          const [maybeMatch2] = await db.getMatch2(match2Id)
          const match2 = maybeMatch2 as Match2Row
          expect(match2.state).to.equal('proposed')
        })
      )
      const rejectedProposedLocalMatch2s = proposedLocalMatch2s
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedProposedLocalMatch2s.length > 0) {
        throw new Error(
          `${rejectedProposedLocalMatch2s.length} local match2s from database rejected with error: ${rejectedProposedLocalMatch2s[0]}`
        )
      }
    })

    it('should acceptA then acceptFinal a match2 on-chain', async () => {
      // propose
      const proposalIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/proposal`, {})
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
      const [fulfilledProposals, rejectedProposals] = await filterRejectedAndAcceptedPromises(proposalIds)
      if (rejectedProposals.length > 0) {
        throw new Error(`${rejectedProposals.length} match2 proposals rejected with error: ${rejectedProposals[0]}`)
      }
      const finalisedMatch2Propoposals = await Promise.allSettled(
        fulfilledProposals.map(async (proposal) => {
          await pollTransactionState(db, proposal, 'finalised')
        })
      )
      const rejectedFinalisedMatch2Propoposals = finalisedMatch2Propoposals
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedMatch2Propoposals.length > 0) {
        throw new Error(
          `${rejectedFinalisedMatch2Propoposals.length} finalised match2 proposals rejected with error: ${rejectedFinalisedMatch2Propoposals[0]}`
        )
      }
      const match2sProposedState = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed')
        })
      )

      const rejectedMatch2sProposedState = match2sProposedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2sProposedState.length > 0) {
        throw new Error(
          `${rejectedMatch2sProposedState.length} match2 proposals failed to reach state proposed with error: ${rejectedMatch2sProposedState[0]}`
        )
      }
      // submit accept to chain
      const responsesAcceptAIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/accept`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.clearAllTransactions()
      const [fulfilledResponsesAcceptAIds, rejectedResponsesAcceptAIds] =
        await filterRejectedAndAcceptedPromises(responsesAcceptAIds)
      if (rejectedResponsesAcceptAIds.length > 0) {
        throw new Error(
          `${rejectedResponsesAcceptAIds.length} rejected acceptAs with error: ${rejectedResponsesAcceptAIds[0]}`
        )
      }
      const finalisedResponseAAccepted = await Promise.allSettled(
        fulfilledResponsesAcceptAIds.map(async (responseAcceptA) => {
          await pollTransactionState(db, responseAcceptA, 'finalised')
        })
      )
      const rejectedFinalisedResponseAAccepted = finalisedResponseAAccepted
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedResponseAAccepted.length > 0) {
        throw new Error(
          `${rejectedFinalisedResponseAAccepted.length} finalised response As rejected with error: ${rejectedFinalisedResponseAAccepted[0]}`
        )
      }
      const match2sInAcceptedAsState = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedA')
        })
      )
      const rejectedMatch2sInAcceptedAsState = match2sInAcceptedAsState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2sInAcceptedAsState.length > 0) {
        throw new Error(
          `${rejectedMatch2sInAcceptedAsState.length} Match2s in AcceptedA state rejected with error: ${rejectedMatch2sInAcceptedAsState[0]}`
        )
      }

      // submit 2nd accept to chain
      const responsesAcceptFinalIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/accept`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.clearAllTransactions()
      const [fulfilledResponsesAcceptFinalIds, rejectedResponsesAcceptFinalIds] =
        await filterRejectedAndAcceptedPromises(responsesAcceptFinalIds)
      if (rejectedResponsesAcceptFinalIds.length > 0) {
        throw new Error(
          `${rejectedResponsesAcceptFinalIds.length} rejected acceptFinals with error: ${rejectedResponsesAcceptFinalIds[0]}`
        )
      }
      const resonsesFinalisedAcceptFinal = await Promise.allSettled(
        fulfilledResponsesAcceptFinalIds.map(async (responseAcceptFinal) => {
          await pollTransactionState(db, responseAcceptFinal, 'finalised')
        })
      )
      const rejectedResonsesFinalisedAcceptFinal = resonsesFinalisedAcceptFinal
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedResonsesFinalisedAcceptFinal.length > 0) {
        throw new Error(
          `${rejectedResonsesFinalisedAcceptFinal.length} response AcceptFinals failed to reach state finalised with error: ${rejectedResonsesFinalisedAcceptFinal[0]} `
        )
      }
      const match2AcceptedFinalState = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedFinal')
        })
      )

      const rejectedMatch2AcceptedFinalState = match2AcceptedFinalState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2AcceptedFinalState.length > 0) {
        throw new Error(
          `${rejectedMatch2AcceptedFinalState.length} match2s failed to reach state acceptedFinal with error: ${rejectedMatch2AcceptedFinalState[0]} `
        )
      }
      // check demands and match2 states
      const demandsAAllocatedState = await Promise.allSettled(
        fulfilledDemandAIds.map(async (demand) => {
          const [maybeDemandA] = await db.getDemand(demand.demandA)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      const rejectedDemandsAAllocatedState = demandsAAllocatedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedDemandsAAllocatedState.length > 0) {
        throw new Error(
          `${rejectedDemandsAAllocatedState.length} demandAs failed to reach state allocated with error: ${rejectedDemandsAAllocatedState[0]} `
        )
      }
      const demandsBAllocatedState = await Promise.allSettled(
        fulfilledDemandBIds.map(async (demand) => {
          const [maybeDemandA] = await db.getDemand(demand.demandB)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      const rejectedDemandsBAllocatedState = demandsBAllocatedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedDemandsBAllocatedState.length > 0) {
        throw new Error(
          `${rejectedDemandsBAllocatedState.length} demandBs failed to reach state allocated with error: ${rejectedDemandsBAllocatedState[0]} `
        )
      }
      const match2DbAcceptedFinalState = await Promise.allSettled(
        fulfilledMatch2s.map(async (match) => {
          const [maybeMatch2AcceptFinal] = await db.getMatch2(match)
          const match2AcceptFinal = maybeMatch2AcceptFinal as Match2Row
          expect(match2AcceptFinal.state).to.equal('acceptedFinal')
        })
      )
      const rejectedMatch2DbAcceptedFinalState = match2DbAcceptedFinalState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedDemandsBAllocatedState.length > 0) {
        throw new Error(
          `${rejectedMatch2DbAcceptedFinalState.length} local match2s failed to reach state acceptedFinal with error: ${rejectedMatch2DbAcceptedFinalState[0]} `
        )
      }
    })
    it('should reject a proposed match2 on-chain', async () => {
      // propose
      const proposalIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/proposal`, {})
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
      const [fulfilledProposals, rejectedProposals] = await filterRejectedAndAcceptedPromises(proposalIds)
      if (rejectedProposals.length > 0) {
        throw new Error(`${rejectedProposals.length} match2 proposals rejected with error: ${rejectedProposals[0]}`)
      }
      const finalisedMatch2Propoposals = await Promise.allSettled(
        fulfilledProposals.map(async (proposal) => {
          await pollTransactionState(db, proposal, 'finalised')
        })
      )
      const rejectedFinalisedMatch2Propoposals = finalisedMatch2Propoposals
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedMatch2Propoposals.length > 0) {
        throw new Error(
          `${rejectedFinalisedMatch2Propoposals.length} finalised match2 proposals rejected with error: ${rejectedFinalisedMatch2Propoposals[0]}`
        )
      }
      const match2sProposedState = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed')
        })
      )

      const rejectedMatch2sProposedState = match2sProposedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2sProposedState.length > 0) {
        throw new Error(
          `${rejectedMatch2sProposedState.length} match2 proposals failed to reach state proposed with error: ${rejectedMatch2sProposedState[0]}`
        )
      }

      // reject match2
      const rejectionIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/rejection`, {})
          expect(response.status).to.equal(200)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.clearAllTransactions()
      const [fulfilledRejectionIds, rejectedRejectionIds] = await filterRejectedAndAcceptedPromises(rejectionIds)
      if (rejectedRejectionIds.length > 0) {
        throw new Error(
          `${rejectedRejectionIds.length} match2 proposals rejections rejected with error: ${rejectedRejectionIds[0]}`
        )
      }
      const finalisedRejectionIds = await Promise.allSettled(
        fulfilledRejectionIds.map(async (rejection) => {
          await pollTransactionState(db, rejection, 'finalised')
        })
      )
      const rejectedFinalisedRejectionIds = finalisedRejectionIds
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedRejectionIds.length > 0) {
        throw new Error(
          `${rejectedFinalisedRejectionIds.length} match2 rejections rejected/failed to reach state finalised with error: ${rejectedFinalisedRejectionIds[0]}`
        )
      }
      await Promise.allSettled(
        fulfilledMatch2s.map(async (match) => {
          await pollMatch2State(db, match, 'rejected')
          const [maybeMatch2Rejected] = await db.getMatch2(match)
          const match2Rejected = maybeMatch2Rejected as Match2Row
          expect(match2Rejected.state).to.equal('rejected')
        })
      )
    })
    it.only('should reject many acceptedA match2s on-chain', async () => {
      // propose
      const proposalIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/proposal`, {})
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
      const [fulfilledProposals, rejectedProposals] = await filterRejectedAndAcceptedPromises(proposalIds)
      if (rejectedProposals.length > 0) {
        throw new Error(`${rejectedProposals.length} match2 proposals rejected with error: ${rejectedProposals[0]}`)
      }
      const finalisedMatch2Propoposals = await Promise.allSettled(
        fulfilledProposals.map(async (proposal) => {
          await pollTransactionState(db, proposal, 'finalised')
        })
      )
      const rejectedFinalisedMatch2Propoposals = finalisedMatch2Propoposals
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedMatch2Propoposals.length > 0) {
        throw new Error(
          `${rejectedFinalisedMatch2Propoposals.length} finalised match2 proposals rejected with error: ${rejectedFinalisedMatch2Propoposals[0]}`
        )
      }
      const match2sProposedState = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed')
        })
      )

      const rejectedMatch2sProposedState = match2sProposedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2sProposedState.length > 0) {
        throw new Error(
          `${rejectedMatch2sProposedState.length} match2 proposals failed to reach state proposed with error: ${rejectedMatch2sProposedState[0]}`
        )
      }
      // submit accept to chain
      const responsesAcceptAIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/accept`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.clearAllTransactions()
      const [fulfilledResponsesAcceptAIds, rejectedResponsesAcceptAIds] =
        await filterRejectedAndAcceptedPromises(responsesAcceptAIds)
      if (rejectedResponsesAcceptAIds.length > 0) {
        throw new Error(
          `${rejectedResponsesAcceptAIds.length} match2 AcceptAs rejected with error: ${rejectedResponsesAcceptAIds[0]}`
        )
      }

      const acceptAResponseFinalised = await Promise.allSettled(
        fulfilledResponsesAcceptAIds.map(async (responseAcceptA) => {
          await pollTransactionState(db, responseAcceptA, 'finalised')
        })
      )
      const rejectedAcceptAResponseFinalised = acceptAResponseFinalised
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedAcceptAResponseFinalised.length > 0) {
        throw new Error(
          `${rejectedAcceptAResponseFinalised.length} match2s failed to reach state finalised with error: ${rejectedAcceptAResponseFinalised[0]}`
        )
      }
      const match2sAcceptedA = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedA')
        })
      )
      const rejectedMatch2sAcceptedA = match2sAcceptedA
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2sAcceptedA.length > 0) {
        throw new Error(
          `${rejectedMatch2sAcceptedA.length} match2s failed to reach state AcceptedA with error: ${rejectedMatch2sAcceptedA[0]}`
        )
      }
      const rejectionIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/rejection`, {})
          expect(response.status).to.equal(200)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )
      const [fulfilledRejections, rejectedRejections] = await filterRejectedAndAcceptedPromises(rejectionIds)
      if (rejectedRejections.length > 0) {
        throw new Error(
          `${rejectedRejections.length} match2 rejections that failed with error: ${rejectedRejections[0]}`
        )
      }
      await node.clearAllTransactions()
      const rejectionIdsFinalised = await Promise.allSettled(
        fulfilledRejections.map(async (reject) => {
          await pollTransactionState(db, reject, 'finalised')
        })
      )
      const rejectedFinalisedRejectionIds = rejectionIdsFinalised
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedRejectionIds.length > 0) {
        throw new Error(
          `${rejectedFinalisedRejectionIds.length} finalised rejection2 ids rejected with error: ${rejectedFinalisedRejectionIds[0]}`
        )
      }
      const match2IdsRejected = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'rejected')
        })
      )
      const rejectedMatch2IdsRejected = match2IdsRejected
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2IdsRejected.length > 0) {
        throw new Error(
          `${rejectedMatch2IdsRejected.length} rejection2 ids failed to reach state rejected with error: ${rejectedMatch2IdsRejected[0]}`
        )
      }
    })

    it.only('should cancel many acceptedFinal match2s on-chain', async () => {
      // propose
      const proposalIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/proposal`, {})
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
      const [fulfilledProposals, rejectedProposals] = await filterRejectedAndAcceptedPromises(proposalIds)
      if (rejectedProposals.length > 0) {
        throw new Error(`${rejectedProposals.length} match2 proposals rejected with error: ${rejectedProposals[0]}`)
      }
      const finalisedMatch2Propoposals = await Promise.allSettled(
        fulfilledProposals.map(async (proposal) => {
          await pollTransactionState(db, proposal, 'finalised')
        })
      )
      const rejectedFinalisedMatch2Propoposals = finalisedMatch2Propoposals
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedMatch2Propoposals.length > 0) {
        throw new Error(
          `${rejectedFinalisedMatch2Propoposals.length} finalised match2 proposals rejected with error: ${rejectedFinalisedMatch2Propoposals[0]}`
        )
      }
      const match2sProposedState = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed')
        })
      )

      const rejectedMatch2sProposedState = match2sProposedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2sProposedState.length > 0) {
        throw new Error(
          `${rejectedMatch2sProposedState.length} match2 proposals failed to reach state proposed with error: ${rejectedMatch2sProposedState[0]}`
        )
      }
      // submit accept to chain
      const responsesAcceptAIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/accept`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.clearAllTransactions()
      const [fulfilledResponsesAcceptAIds, rejectedResponsesAcceptAIds] =
        await filterRejectedAndAcceptedPromises(responsesAcceptAIds)
      if (rejectedResponsesAcceptAIds.length > 0) {
        throw new Error(
          `${rejectedResponsesAcceptAIds.length} match2 AcceptAs rejected with error: ${rejectedResponsesAcceptAIds[0]}`
        )
      }
      const acceptAResponseFinalised = await Promise.allSettled(
        fulfilledResponsesAcceptAIds.map(async (responseAcceptA) => {
          await pollTransactionState(db, responseAcceptA, 'finalised')
        })
      )
      const rejectedAcceptAResponseFinalised = acceptAResponseFinalised
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedAcceptAResponseFinalised.length > 0) {
        throw new Error(
          `${rejectedAcceptAResponseFinalised.length} match2s failed to reach state finalised with error: ${rejectedAcceptAResponseFinalised[0]}`
        )
      }
      const match2sAcceptedA = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedA')
        })
      )
      const rejectedMatch2sAcceptedA = match2sAcceptedA
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2sAcceptedA.length > 0) {
        throw new Error(
          `${rejectedMatch2sAcceptedA.length} match2s failed to reach state AcceptedA with error: ${rejectedMatch2sAcceptedA[0]}`
        )
      }

      // submit 2nd accept to chain
      const responsesAcceptFinalIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/accept`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.clearAllTransactions()
      const [fulfilledResponsesAcceptFinalIds, rejectedResponsesAcceptFinalIds] =
        await filterRejectedAndAcceptedPromises(responsesAcceptFinalIds)
      if (rejectedResponsesAcceptFinalIds.length > 0) {
        throw new Error(
          `${rejectedResponsesAcceptFinalIds.length} match2 AcceptFinal rejected with error: ${rejectedResponsesAcceptFinalIds[0]}`
        )
      }

      const acceptFinalResponseFinalised = await Promise.allSettled(
        fulfilledResponsesAcceptFinalIds.map(async (responseAcceptFinal) => {
          await pollTransactionState(db, responseAcceptFinal, 'finalised')
        })
      )

      const rejectedAcceptFinalResponseFinalised = acceptFinalResponseFinalised
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedAcceptFinalResponseFinalised.length > 0) {
        throw new Error(
          `${rejectedAcceptFinalResponseFinalised.length} match2s AcceptedFinals failed to reach state finalised with error: ${rejectedAcceptFinalResponseFinalised[0]}`
        )
      }
      const acceptedFinalMatch2 = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedFinal')
        })
      )
      const rejectedAcceptedFinalMatch2 = acceptedFinalMatch2
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedAcceptedFinalMatch2.length > 0) {
        throw new Error(
          `${rejectedAcceptedFinalMatch2.length} match2s failed to reach state AcceptedFinal with error: ${rejectedAcceptedFinalMatch2[0]}`
        )
      }

      // check demandAs
      const demandsAAllocatedState = await Promise.allSettled(
        fulfilledDemandAIds.map(async (demand) => {
          const [maybeDemandA] = await db.getDemand(demand.demandA)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      const rejectedDemandsAAllocatedState = demandsAAllocatedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedDemandsAAllocatedState.length > 0) {
        throw new Error(
          `${rejectedDemandsAAllocatedState.length} demandAs failed to reach state allocated with error: ${rejectedDemandsAAllocatedState[0]} `
        )
      }
      const demandsBAllocatedState = await Promise.allSettled(
        fulfilledDemandBIds.map(async (demand) => {
          const [maybeDemandA] = await db.getDemand(demand.demandB)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      const rejectedDemandsBAllocatedState = demandsBAllocatedState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedDemandsBAllocatedState.length > 0) {
        throw new Error(
          `${rejectedDemandsBAllocatedState.length} demandBs failed to reach state allocated with error: ${rejectedDemandsBAllocatedState[0]} `
        )
      }
      const match2DbAcceptedFinalState = await Promise.allSettled(
        fulfilledMatch2s.map(async (match) => {
          const [maybeMatch2AcceptFinal] = await db.getMatch2(match)
          const match2AcceptFinal = maybeMatch2AcceptFinal as Match2Row
          expect(match2AcceptFinal.state).to.equal('acceptedFinal')
        })
      )
      const rejectedMatch2DbAcceptedFinalState = match2DbAcceptedFinalState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedDemandsBAllocatedState.length > 0) {
        throw new Error(
          `${rejectedMatch2DbAcceptedFinalState.length} local match2s failed to reach state acceptedFinal with error: ${rejectedMatch2DbAcceptedFinalState[0]} `
        )
      }
      // submit a cancellation request
      const cancelledIds = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          // submit to chain
          const data = { attachmentId: parametersAttachmentId }
          const response = await post(context.app, `/v1/match2/${match2Id}/cancellation`, data)
          expect(response.status).to.equal(200)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )
      // wait for block to finalise
      await node.clearAllTransactions()

      const [fulfilledCancelledIds, rejectedCancelledIds] = await filterRejectedAndAcceptedPromises(cancelledIds)
      if (rejectedCancelledIds.length > 0) {
        throw new Error(
          `${rejectedCancelledIds.length} rejected match2 cancellations with error: ${rejectedCancelledIds[0]}`
        )
      }

      const finalisedMatch2Cancellation = await Promise.allSettled(
        fulfilledCancelledIds.map(async (responseAcceptFinal) => {
          await pollTransactionState(db, responseAcceptFinal, 'finalised')
        })
      )
      const rejectedFinalisedMatch2Cancellation = finalisedMatch2Cancellation
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedFinalisedMatch2Cancellation.length > 0) {
        throw new Error(
          `${rejectedFinalisedMatch2Cancellation.length} cancelled match2s failed to reach state finalised with error: ${rejectedFinalisedMatch2Cancellation[0]} `
        )
      }
      const match2sCancelledState = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'cancelled')
        })
      )
      const rejectedMatch2sCancelledState = match2sCancelledState
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedMatch2sCancelledState.length > 0) {
        throw new Error(
          `${rejectedMatch2sCancelledState.length} cancelled match2s failed to reach state cancelled with error: ${rejectedMatch2sCancelledState[0]} `
        )
      }
      const cancelledDemandAs = await Promise.allSettled(
        fulfilledDemandAIds.map(async (demand) => {
          const demandA: DemandRow = await db.getDemand(demand.demandA).then((rows: DemandRow[]) => rows[0])
          expect(demandA).to.deep.contain({
            state: 'cancelled',
          })
        })
      )
      const rejectedCancelledDemandAs = cancelledDemandAs
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedCancelledDemandAs.length > 0) {
        throw new Error(
          `${rejectedCancelledDemandAs.length} demandAs failed to reach state cancelled with error: ${rejectedCancelledDemandAs[0]} `
        )
      }

      const cancelledDemandBs = await Promise.allSettled(
        fulfilledDemandBIds.map(async (demand) => {
          const demandB: DemandRow = await db.getDemand(demand.demandB).then((rows: DemandRow[]) => rows[0])
          expect(demandB).to.deep.contain({
            state: 'cancelled',
          })
        })
      )
      const rejectedCancelledDemandBs = cancelledDemandBs
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedCancelledDemandBs.length > 0) {
        throw new Error(
          `${rejectedCancelledDemandBs.length} demandBs failed to reach state cancelled with error: ${rejectedCancelledDemandBs[0]} `
        )
      }
      const cancelledmatch2s = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          const match2: Match2Row = await db.getMatch2(match2Id).then((rows: Match2Row[]) => rows[0])
          expect(match2).to.deep.contain({
            state: 'cancelled',
          })
        })
      )
      const rejectedCancelledmatch2s = cancelledmatch2s
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)
      if (rejectedCancelledmatch2s.length > 0) {
        throw new Error(
          `${rejectedCancelledmatch2s.length} match2s failed to reach state cancelled with error: ${rejectedCancelledmatch2s[0]} `
        )
      }
    })
  })
  describe('re-match2', async () => {
    let match2Ids: PromiseSettledResult<string>[] = []
    let rematch2Ids: PromiseSettledResult<string>[] = []
    let demandAIds: PromiseSettledResult<{
      originalDemandA: number
      demandA: string
      transactionId: any
    }>[] = []
    let demandBIds: PromiseSettledResult<{
      originalDemandB: number
      demandB: string
      transactionId: any
    }>[] = []
    let newDemandBIds: PromiseSettledResult<{
      originalDemandB: number
      demandB: string
      transactionId: any
    }>[] = []
    let fulfilledMatch2s: string[] = []
    let rejectedMatch2s: any[] = []
    let fulfilledDemandAIds: {
      originalDemandA: number
      demandA: string
      transactionId: any
    }[] = []
    let rejectedDemandAIds: any[] = []
    let fulfilledDemandBIds: {
      originalDemandB: number
      demandB: string
      transactionId: any
    }[] = []
    let rejectedDemandBIds: any[] = []
    let fulfilledNewDemandBIds: {
      originalDemandB: number
      demandB: string
      transactionId: any
    }[] = []
    let rejectedNewDemandBIds: any[] = []
    beforeEach(async () => {
      const numberIds = 10

      demandAIds = await Promise.allSettled(
        Array(numberIds)
          .fill(null)
          .map(async () => {
            const {
              body: { id: demandAId },
            } = await post(context.app, '/v1/demandA', { parametersAttachmentId })
            const {
              body: { id: demandATransactionId },
            } = await post(context.app, `/v1/demandA/${demandAId}/creation`, {})

            const [demandA]: DemandRow[] = await db.getDemand(demandAId)

            return {
              originalDemandA: demandA.originalTokenId as number,
              demandA: demandAId as string,
              transactionId: demandATransactionId,
            }
          })
      )

      await node.clearAllTransactions()
      const filteredDemandAIds = await filterRejectedAndAcceptedPromisesForMatch2(demandAIds)
      fulfilledDemandAIds = filteredDemandAIds[0]
      rejectedDemandAIds = filteredDemandAIds[1]
      if (rejectedDemandAIds.length > 0) {
        throw new Error(`${rejectedDemandAIds.length} demand As were rejected with Error: ${rejectedDemandAIds[0]}`)
      }
      //check demand and transaction state
      for (const demandA of fulfilledDemandAIds) {
        await pollTransactionState(db, demandA.transactionId, 'finalised')
        await pollDemandState(db, demandA.demandA, 'created')
      }

      demandBIds = await Promise.allSettled(
        Array(numberIds)
          .fill(null)
          .map(async () => {
            const {
              body: { id: demandBId },
            } = await post(context.app, '/v1/demandB', { parametersAttachmentId })
            const {
              body: { id: demandBTransactionId },
            } = await post(context.app, `/v1/demandB/${demandBId}/creation`, {})
            const [demandB]: DemandRow[] = await db.getDemand(demandBId)

            return {
              originalDemandB: demandB.originalTokenId as number,
              demandB: demandBId as string,
              transactionId: demandBTransactionId,
            }
          })
      )
      await node.clearAllTransactions()
      const filteredDemandBIds = await filterRejectedAndAcceptedPromisesForMatch2(demandBIds)
      fulfilledDemandBIds = filteredDemandBIds[0]
      rejectedDemandBIds = filteredDemandBIds[1]
      if (rejectedDemandBIds.length > 0) {
        throw new Error(`${rejectedDemandBIds.length} demand Bs were rejected with Error: ${rejectedDemandBIds[0]}`)
      }

      //check demand and transaction state
      for (const demandB of fulfilledDemandBIds) {
        await pollTransactionState(db, demandB.transactionId, 'finalised')
        await pollDemandState(db, demandB.demandB, 'created')
      }

      // check we have 500 demandAs and 500 demandBs
      if (demandAIds.length !== demandBIds.length) {
        throw new Error('Mismatch between demand A and demand B lengths')
      }

      match2Ids = await Promise.allSettled(
        fulfilledDemandAIds.map(async (demandA, index) => {
          const demandB = fulfilledDemandBIds[index]
          const {
            body: { id: match2Id },
          } = await post(context.app, '/v1/match2', { demandA: demandA.demandA, demandB: demandB.demandB })
          return match2Id as UUID
        })
      )
      await node.clearAllTransactions()
      const match2sFilteredRes = await filterRejectedAndAcceptedPromises(match2Ids)
      fulfilledMatch2s = match2sFilteredRes[0]
      rejectedMatch2s = match2sFilteredRes[1]

      if (rejectedMatch2s.length > 0) {
        throw new Error(`${rejectedMatch2s.length} prepared match2s rejected ${rejectedMatch2s}`)
      }
      // check we have correct number of match2s
      if (fulfilledMatch2s.length !== numberIds) {
        throw new Error(`We do not have correct number of match2s, length: ${fulfilledMatch2s.length}`)
      }
      newDemandBIds = await Promise.allSettled(
        Array(numberIds)
          .fill(null)
          .map(async () => {
            const {
              body: { id: demandBId },
            } = await post(context.app, '/v1/demandB', { parametersAttachmentId })
            const {
              body: { id: demandBTransactionId },
            } = await post(context.app, `/v1/demandB/${demandBId}/creation`, {})
            const [demandB]: DemandRow[] = await db.getDemand(demandBId)

            return {
              originalDemandB: demandB.originalTokenId as number,
              demandB: demandBId as string,
              transactionId: demandBTransactionId,
            }
          })
      )
      await node.clearAllTransactions()
      const filteredNewDemandBIds = await filterRejectedAndAcceptedPromisesForMatch2(newDemandBIds)
      fulfilledNewDemandBIds = filteredNewDemandBIds[0]
      rejectedNewDemandBIds = filteredNewDemandBIds[1]
      if (rejectedDemandBIds.length > 0) {
        throw new Error(`${rejectedDemandBIds.length} demand Bs were rejected with Error: ${rejectedDemandBIds[0]}`)
      }
      // check demand and transaction state for new demands
      for (const demandB of fulfilledNewDemandBIds) {
        await pollTransactionState(db, demandB.transactionId, 'finalised')
        await pollDemandState(db, demandB.demandB, 'created')
      }

      // check that we have same amount of demandAs and new demandBs
      if (fulfilledDemandAIds.length !== fulfilledNewDemandBIds.length) {
        throw new Error('Mismatch between demand A and new demand B lengths')
      }
    })
    it('should propose a rematch2 on-chain', async () => {
      const transactionIds = await Promise.all(
        match2Ids.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/proposal`, {})
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
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          const [maybeMatch2] = await db.getMatch2(match2Id)
          const match2 = maybeMatch2 as Match2Row
          expect(match2.state).to.equal('proposed')
        })
      )
      const responsesAcceptAIds = await Promise.all(
        match2Ids.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/accept`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.sealBlock()
      await Promise.all(
        responsesAcceptAIds.map(async (responseAcceptA) => {
          await pollTransactionState(db, responseAcceptA, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedA')
        })
      )

      // submit 2nd accept to chain
      const responsesAcceptFinalIds = await Promise.all(
        match2Ids.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/accept`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.sealBlock()
      await Promise.all(
        responsesAcceptFinalIds.map(async (responseAcceptFinal) => {
          await pollTransactionState(db, responseAcceptFinal, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedFinal')
        })
      )
      // check demandAs
      await Promise.all(
        demandAIds.map(async (demand) => {
          const [maybeDemandA] = await db.getDemand(demand.demandA)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      await Promise.all(
        demandBIds.map(async (demand) => {
          const [maybeDemandB] = await db.getDemand(demand.demandB)
          const demandB = maybeDemandB as DemandRow
          expect(demandB.state).to.equal('allocated')
        })
      )
      await Promise.all(
        match2Ids.map(async (match) => {
          const [maybeMatch2AcceptFinal] = await db.getMatch2(match)
          const match2AcceptFinal = maybeMatch2AcceptFinal as Match2Row
          expect(match2AcceptFinal.state).to.equal('acceptedFinal')
        })
      )

      //prepare rematches
      rematch2Ids = await Promise.all(
        demandAIds.map(async (demandA, index) => {
          const demandB = newDemandBIds[index]
          const replacingMatch2 = match2Ids[index]
          const {
            body: { id: rematch2Id },
          } = await post(context.app, '/v1/match2', {
            demandA: demandA.demandA,
            demandB: demandB.demandB,
            replaces: replacingMatch2,
          })
          return rematch2Id as UUID
        })
      )
      await node.sealBlock()
      //submit rematches to chain
      const proposedRematch2Ids = await Promise.all(
        rematch2Ids.map(async (rematch2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${rematch2Id}/proposal`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )
      // wait for block to finalise
      await node.sealBlock()
      await Promise.all(
        responsesAcceptFinalIds.map(async (responseAcceptFinal) => {
          await pollTransactionState(db, responseAcceptFinal, 'finalised')
        })
      )
      await Promise.all(
        rematch2Ids.map(async (rematch2Id) => {
          await pollMatch2State(db, rematch2Id, 'proposed')
        })
      )
      //check status of demands and matches
      await Promise.all(
        demandAIds.map(async (demand) => {
          const [maybeDemandA] = await db.getDemand(demand.demandA)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      await Promise.all(
        match2Ids.map(async (match) => {
          const [maybeOldMatch2] = await db.getMatch2(match)
          const oldMatch2 = maybeOldMatch2 as Match2Row
          expect(oldMatch2.state).to.equal('acceptedFinal')
        })
      )
      await Promise.all(
        newDemandBIds.map(async (demand) => {
          const [maybeNewDemandB] = await db.getDemand(demand.demandB)
          const demandB = maybeNewDemandB as DemandRow
          expect(demandB.state).to.equal('created')
        })
      )
      await Promise.all(
        rematch2Ids.map(async (rematch) => {
          const [maybereMatch2] = await db.getMatch2(rematch)
          const rematch2 = maybereMatch2 as Match2Row
          expect(rematch2.state).to.equal('proposed')
        })
      )
    })
    it('accepts a rematch2 proposal', async () => {
      const transactionIds = await Promise.all(
        match2Ids.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/proposal`, {})
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
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed')
        })
      )

      const responsesAcceptAIds = await Promise.all(
        match2Ids.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/accept`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.sealBlock()
      await Promise.all(
        responsesAcceptAIds.map(async (responseAcceptA) => {
          await pollTransactionState(db, responseAcceptA, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedA')
        })
      )
      // submit 2nd accept to chain
      const responsesAcceptFinalIds = await Promise.all(
        match2Ids.map(async (match2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${match2Id}/accept`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )

      // wait for block to finalise
      await node.sealBlock()
      await Promise.all(
        responsesAcceptFinalIds.map(async (responseAcceptFinal) => {
          await pollTransactionState(db, responseAcceptFinal, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedFinal')
        })
      )
      //prepare rematches
      rematch2Ids = await Promise.all(
        demandAIds.map(async (demandA, index) => {
          const demandB = newDemandBIds[index]
          const replacingMatch2 = match2Ids[index]
          const {
            body: { id: rematch2Id },
          } = await post(context.app, '/v1/match2', {
            demandA: demandA.demandA,
            demandB: demandB.demandB,
            replaces: replacingMatch2,
          })
          return rematch2Id as UUID
        })
      )
      await node.sealBlock()
      //submit rematches to chain
      const proposedRematch2Ids = await Promise.all(
        rematch2Ids.map(async (rematch2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${rematch2Id}/proposal`, {})
          expect(response.status).to.equal(201)

          const { id: transactionId, state } = response.body
          expect(transactionId).to.match(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
          )
          expect(state).to.equal('submitted')
          return transactionId as string
        })
      )
      // wait for block to finalise
      await node.sealBlock()
      await Promise.all(
        responsesAcceptFinalIds.map(async (responseAcceptFinal) => {
          await pollTransactionState(db, responseAcceptFinal, 'finalised')
        })
      )
      await Promise.all(
        rematch2Ids.map(async (rematch2Id) => {
          await pollMatch2State(db, rematch2Id, 'proposed')
        })
      )
      const acceptedRematch2Ids = await Promise.all(
        rematch2Ids.map(async (rematch2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${rematch2Id}/accept`, {})
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
        responsesAcceptFinalIds.map(async (responseAcceptFinal) => {
          await pollTransactionState(db, responseAcceptFinal, 'finalised')
        })
      )
      await Promise.all(
        rematch2Ids.map(async (rematch2Id) => {
          await pollMatch2State(db, rematch2Id, 'acceptedA')
        })
      )
      const acceptedFinalRematch2Ids = await Promise.all(
        rematch2Ids.map(async (rematch2Id) => {
          // submit to chain
          const response = await post(context.app, `/v1/match2/${rematch2Id}/accept`, {})
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
        responsesAcceptFinalIds.map(async (responseAcceptFinal) => {
          await pollTransactionState(db, responseAcceptFinal, 'finalised')
        })
      )
      await Promise.all(
        rematch2Ids.map(async (rematch2Id) => {
          await pollMatch2State(db, rematch2Id, 'acceptedFinal')
        })
      )
      //check status of demands and matches
      await Promise.all(
        demandAIds.map(async (demand) => {
          const [maybeDemandA] = await db.getDemand(demand.demandA)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      await Promise.all(
        demandBIds.map(async (demand) => {
          const [maybeDemandB] = await db.getDemand(demand.demandB)
          const demandB = maybeDemandB as DemandRow
          expect(demandB.state).to.equal('cancelled')
        })
      )
      await Promise.all(
        match2Ids.map(async (match) => {
          const [maybeOldMatch2] = await db.getMatch2(match)
          const oldMatch2 = maybeOldMatch2 as Match2Row
          expect(oldMatch2.state).to.equal('cancelled')
        })
      )
      await Promise.all(
        newDemandBIds.map(async (demand) => {
          const [maybeNewDemandB] = await db.getDemand(demand.demandB)
          const demandB = maybeNewDemandB as DemandRow
          expect(demandB.state).to.equal('allocated')
        })
      )
      await Promise.all(
        rematch2Ids.map(async (rematch) => {
          const [maybereMatch2] = await db.getMatch2(rematch)
          const rematch2 = maybereMatch2 as Match2Row
          expect(rematch2.state).to.equal('acceptedFinal')
        })
      )
    })
  })
})
