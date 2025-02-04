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
  createMultipleRematches,
  createRematch2,
  DemandType,
  filterRejectedAndAcceptedPromises,
  filterRejectedAndAcceptedPromisesForMatch2,
  submitAndVerifyTransactions,
  verifyDemandState,
  verifyMatch2DatabaseState,
  verifyMatch2State,
} from '../../helper/parallelTests.js'

describe('on-chain parallel', function () {
  this.timeout(180000)
  const db = new Database()
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }

  withAppAndIndexer(context)
  withIdentitySelfMock()

  beforeEach(async () => await seed())
  afterEach(async () => await cleanup())

  describe('match2 parallel', async () => {
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
  describe('re-match2 parallel ', async () => {
    let fulfilledMatch2s: string[] = []
    let fulfilledDemandAIds: DemandType[] = []
    let fulfilledDemandBIds: DemandType[] = []
    let fulfilledNewDemandBIds: DemandType[] = []

    beforeEach(async () => {
      const numberOfDemands = 10

      // Create and finalize demandA
      fulfilledDemandAIds = await createMultipleDemands(context, db, 'demandA', numberOfDemands, node)

      // Create and finalize demandB
      fulfilledDemandBIds = await createMultipleDemands(context, db, 'demandB', numberOfDemands, node)

      // Ensure demand counts match
      if (fulfilledDemandAIds.length !== fulfilledDemandBIds.length) {
        throw new Error('Mismatch between demand A and demand B lengths')
      }

      // Create match2 transactions
      fulfilledMatch2s = await createMatch2s(context, fulfilledDemandAIds, fulfilledDemandBIds, node)

      // Create and finalize new demandB for re-matching
      fulfilledNewDemandBIds = await createMultipleDemands(context, db, 'demandB', numberOfDemands, node)

      // Ensure demandA and new demandB counts match
      if (fulfilledDemandAIds.length !== fulfilledNewDemandBIds.length) {
        throw new Error('Mismatch between demand A and new demand B lengths')
      }
    })
    it('should propose a rematch2 on-chain', async () => {
      // Step 1: Propose match2s
      const transactionIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'proposal'
      )

      // Step 2: Verify match2s are proposed
      await verifyMatch2State(fulfilledMatch2s, 'proposed', db)
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'proposed', db)

      // Step 3: First acceptance of match2s
      const responsesAcceptAIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'accept'
      )

      await verifyMatch2State(fulfilledMatch2s, 'acceptedA', db)

      // Step 4: Final acceptance of match2s
      const responsesAcceptFinalIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'accept'
      )

      await verifyMatch2State(fulfilledMatch2s, 'acceptedFinal', db)
      await verifyDemandState(fulfilledDemandAIds, 'allocated', db)
      await verifyDemandState(fulfilledDemandBIds, 'allocated', db)
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'acceptedFinal', db)

      // Step 5: Prepare rematches
      const rematch2Ids = await createMultipleRematches(
        context,
        fulfilledDemandAIds,
        fulfilledNewDemandBIds,
        fulfilledMatch2s,
        node
      )
      await node.clearAllTransactions()

      // Step 6: Propose rematch2s
      const proposedRematch2Ids = await submitAndVerifyTransactions(
        context,
        db,
        node,
        rematch2Ids,
        'match2',
        'finalised',
        'proposal'
      )

      await verifyMatch2State(rematch2Ids, 'proposed', db)

      // Step 7: Verify final states
      await verifyDemandState(fulfilledDemandAIds, 'allocated', db)
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'acceptedFinal', db)
      await verifyDemandState(fulfilledNewDemandBIds, 'created', db)
      await verifyMatch2DatabaseState(rematch2Ids, 'proposed', db)
    })
    it('accepts a rematch2 proposal', async () => {
      // Step 1: Propose match2s
      const transactionIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'proposal'
      )

      // Step 2: Verify match2s are proposed
      await verifyMatch2State(fulfilledMatch2s, 'proposed', db)
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'proposed', db)

      // Step 3: First acceptance of match2s
      const responsesAcceptAIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'accept'
      )
      // Step 4: Final acceptance of match2s
      const responsesAcceptFinalIds = await submitAndVerifyTransactions(
        context,
        db,
        node,
        fulfilledMatch2s,
        'match2',
        'finalised',
        'accept'
      )
      await verifyMatch2State(fulfilledMatch2s, 'acceptedFinal', db)
      await verifyDemandState(fulfilledDemandAIds, 'allocated', db)
      await verifyDemandState(fulfilledDemandBIds, 'allocated', db)
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'acceptedFinal', db)

      //prepare rematches
      const rematch2Ids = await createMultipleRematches(
        context,
        fulfilledDemandAIds,
        fulfilledNewDemandBIds,
        fulfilledMatch2s,
        node
      )
      await node.clearAllTransactions()

      //submit rematches to chain
      const proposedRematch2Ids = await submitAndVerifyTransactions(
        context,
        db,
        node,
        rematch2Ids,
        'match2',
        'finalised',
        'proposal'
      )
      await verifyMatch2State(rematch2Ids, 'proposed', db)

      const acceptedRematch2Ids = await submitAndVerifyTransactions(
        context,
        db,
        node,
        rematch2Ids,
        'match2',
        'finalised',
        'accept'
      )
      await verifyMatch2State(rematch2Ids, 'acceptedA', db)
      const acceptedFinalRematch2Ids = await submitAndVerifyTransactions(
        context,
        db,
        node,
        rematch2Ids,
        'match2',
        'finalised',
        'accept'
      )
      await verifyMatch2State(rematch2Ids, 'acceptedFinal', db)

      //check status of demands and matches
      await verifyDemandState(fulfilledDemandAIds, 'allocated', db)
      await verifyDemandState(fulfilledDemandBIds, 'cancelled', db)
      await verifyMatch2DatabaseState(fulfilledMatch2s, 'cancelled', db)
      await verifyDemandState(fulfilledNewDemandBIds, 'allocated', db)
      await verifyMatch2DatabaseState(rematch2Ids, 'acceptedFinal', db)
    })
  })
})
