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
  createMatch2s,
  createMultipleDemands,
  DemandType,
  filterRejectedAndAcceptedPromises,
  filterRejectedAndAcceptedPromisesForMatch2,
  submitAndVerifyTransactions,
  verifyDemandState,
  verifyMatch2DatabaseState,
  verifyMatch2State,
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
    let fulfilledMatch2s: string[] = []
    let fulfilledDemandAIds: DemandType[] = []
    let fulfilledDemandBIds: DemandType[] = []

    beforeEach(async () => {
      const numberOfDemands = 200

      fulfilledDemandAIds = await createMultipleDemands(context, db, 'demandA', numberOfDemands, node)
      fulfilledDemandBIds = await createMultipleDemands(context, db, 'demandB', numberOfDemands, node)

      if (fulfilledDemandAIds.length !== fulfilledDemandBIds.length) {
        throw new Error(`Mismatch between demand A and demand B lengths`)
      }

      fulfilledMatch2s = await createMatch2s(context, fulfilledDemandAIds, fulfilledDemandBIds, node)
    })

    it('should propose many match2s on-chain', async () => {
      const transactionIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'proposal'
      )

      const proposedMatch2sResults = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed')
        })
      )

      const rejectedProposedMatch2s = proposedMatch2sResults
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)

      if (rejectedProposedMatch2s.length > 0) {
        throw new Error(
          `${rejectedProposedMatch2s.length} proposed match2s rejected with error: ${rejectedProposedMatch2s[0]}`
        )
      }

      // Verify local database reflects the 'proposed' state for match2s
      const proposedLocalMatch2sResults = await Promise.allSettled(
        fulfilledMatch2s.map(async (match2Id) => {
          const [maybeMatch2] = await db.getMatch2(match2Id)
          const match2 = maybeMatch2 as Match2Row
          expect(match2.state).to.equal('proposed')
        })
      )

      const rejectedProposedLocalMatch2s = proposedLocalMatch2sResults
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason)

      if (rejectedProposedLocalMatch2s.length > 0) {
        throw new Error(
          `${rejectedProposedLocalMatch2s.length} local match2s from database rejected with error: ${rejectedProposedLocalMatch2s[0]}`
        )
      }
    })

    it('should acceptA then acceptFinal a match2 on-chain', async () => {
      // Submit proposals for match2s
      const proposalTransactionIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'proposal'
      )

      // Verify match2s are in 'proposed' state
      await verifyMatch2State(fulfilledMatch2s, 'proposed', db)

      // Submit first accept (acceptA)
      const acceptATransactionIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'accept'
      )

      // Verify match2s are in 'acceptedA' state
      await verifyMatch2State(fulfilledMatch2s, 'acceptedA', db)

      // Submit second accept (acceptFinal)
      const acceptFinalTransactionIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'accept'
      )

      // Verify match2s are in 'acceptedFinal' state
      await verifyMatch2State(fulfilledMatch2s, 'acceptedFinal', db)

      // Verify demands A are in 'allocated' state
      await verifyDemandState(fulfilledDemandAIds, 'allocated', db)

      // Verify demands B are in 'allocated' state
      await verifyDemandState(fulfilledDemandBIds, 'allocated', db)

      // Verify match2s in the database are in 'acceptedFinal' state
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'acceptedFinal', db)
    })
    it('should reject a proposed match2 on-chain', async () => {
      // Propose match2 transactions
      const proposalIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'proposal'
      )

      // Verify match2 proposed state
      await verifyMatch2State(fulfilledMatch2s, 'proposed', db)

      // Reject match2 transactions
      const rejectionIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'rejection',
        '',
        200
      )

      // Verify match2 rejected state
      await verifyMatch2State(fulfilledMatch2s, 'rejected', db)

      // Confirm match2 rejection in database
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'rejected', db)
    })
    it('should reject many acceptedA match2s on-chain', async () => {
      // Propose match2 transactions
      const proposalIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'proposal'
      )

      // Verify match2 proposed state
      await verifyMatch2State(fulfilledMatch2s, 'proposed', db)

      // Accept match2 transactions
      const acceptAIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'accept'
      )

      // Verify match2 acceptedA state
      await verifyMatch2State(fulfilledMatch2s, 'acceptedA', db)

      // Reject match2 transactions
      const rejectionIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'rejection',
        '',
        200
      )

      // Verify match2 rejected state
      await verifyMatch2State(fulfilledMatch2s, 'rejected', db)

      // Confirm match2 rejection in database
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'rejected', db)
    })

    it('should cancel many acceptedFinal match2s on-chain', async () => {
      // Propose match2 transactions
      const proposalIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'proposal'
      )

      // Verify match2 proposed state
      await verifyMatch2State(fulfilledMatch2s, 'proposed', db)

      // Accept match2 transactions (first acceptance)
      const acceptAIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'accept'
      )

      // Verify match2 acceptedA state
      await verifyMatch2State(fulfilledMatch2s, 'acceptedA', db)

      // Accept match2 transactions (final acceptance)
      const acceptFinalIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'accept'
      )

      // Verify match2 acceptedFinal state
      await verifyMatch2State(fulfilledMatch2s, 'acceptedFinal', db)

      // Confirm demands are allocated
      await verifyDemandState(fulfilledDemandAIds, 'allocated', db)
      await verifyDemandState(fulfilledDemandBIds, 'allocated', db)

      // Confirm match2 acceptedFinal state in database
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'acceptedFinal', db)

      // Submit cancellation requests
      const cancellationIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'cancellation',
        parametersAttachmentId,
        200
      )

      // Verify match2 cancelled state
      await verifyMatch2State(fulfilledMatch2s, 'cancelled', db)

      // Confirm cancellations in database
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'cancelled', db)
      await verifyDemandState(fulfilledDemandAIds, 'cancelled', db)
      await verifyDemandState(fulfilledDemandBIds, 'cancelled', db)
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
