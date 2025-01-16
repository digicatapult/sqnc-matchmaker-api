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
  demandAId,
  demandBId,
  processDemandAIds,
  processDemandBIds,
  processMatch2TransactionsInChunks,
  processMatches2InChunks,
} from './helpers.js'

describe('on-chain', function () {
  this.timeout(180000)
  const db = new Database()
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }
  // how many ids we create before sealing a block * number of repeats => num of records we create
  // example: numberIdsPerBlock = 100 * numberOfRepeats = 5 => gives us 500 ids
  const numberIdsPerBlock = 100
  const numberOfRepeats = 5

  withAppAndIndexer(context)
  withIdentitySelfMock()

  beforeEach(async () => await seed())
  afterEach(async () => await cleanup())

  describe('match2 - parallel', async () => {
    let match2Ids: string[] = []
    let demandAIds: demandAId[] = []
    let demandBIds: demandBId[] = []

    beforeEach(async () => {
      demandAIds = await processDemandAIds(numberOfRepeats, numberIdsPerBlock, context, node, db)

      //check demand and transaction state
      console.log(`demandA ids length : ${demandAIds.length}`)
      for (const demandA of demandAIds) {
        await pollTransactionState(db, demandA.transactionId, 'finalised')
        await pollDemandState(db, demandA.demandA, 'created')
      }

      demandBIds = await processDemandBIds(numberOfRepeats, numberIdsPerBlock, context, node, db)
      //check demand and transaction state
      for (const demandB of demandBIds) {
        await pollTransactionState(db, demandB.transactionId, 'finalised')
        await pollDemandState(db, demandB.demandB, 'created')
      }

      // check we have 500 demandAs and 500 demandBs
      if (demandAIds.length !== demandBIds.length) {
        console.log(`demandAs: ${demandAIds.length}`)
        console.log(`demandBs: ${demandBIds.length}`)

        throw new Error('Mismatch between demand A and demand B lengths')
      }

      match2Ids = await processMatches2InChunks(demandAIds, demandBIds, numberIdsPerBlock, node, context)

      await node.sealBlock()
      // check we have 500 match2s
      if (match2Ids.length !== 500) {
        throw new Error('We do not have enough match2s')
      }
    })
    afterEach(() => {
      match2Ids = []
      demandAIds = []
      demandBIds = []
    })

    it('should propose many match2s on-chain', async () => {
      const proposalIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'proposal',
        node
      )

      await Promise.all(
        proposalIds.map(async (tx) => {
          await pollTransactionState(db, tx, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed', 500)
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          const [maybeMatch2] = await db.getMatch2(match2Id)
          const match2 = maybeMatch2 as Match2Row
          expect(match2.state).to.equal('proposed')
        })
      )
    })

    it('should acceptA then acceptFinal a match2 on-chain', async () => {
      // propose
      const proposalIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'proposal',
        node
      )

      await node.sealBlock()
      await Promise.all(
        proposalIds.map(async (proposal) => {
          await pollTransactionState(db, proposal, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed', 500)
        })
      )
      // submit accept to chain
      const responsesAcceptAIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'accept',
        node
      )

      // wait for block to finalise
      await Promise.all(
        responsesAcceptAIds.map(async (responseAcceptA) => {
          await pollTransactionState(db, responseAcceptA, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'acceptedA', 500)
        })
      )

      // submit 2nd accept to chain
      const responsesAcceptFinalIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'accept',
        node
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
          await pollMatch2State(db, match2Id, 'acceptedFinal', 500)
        })
      )
      // check demans and match2 states
      await Promise.all(
        demandAIds.map(async (demand) => {
          const [maybeDemandA] = await db.getDemand(demand.demandA)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      await Promise.all(
        demandBIds.map(async (demand) => {
          const [maybeDemandA] = await db.getDemand(demand.demandB)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      await Promise.all(
        match2Ids.map(async (match) => {
          const [maybeMatch2AcceptFinal] = await db.getMatch2(match)
          const match2AcceptFinal = maybeMatch2AcceptFinal as Match2Row
          expect(match2AcceptFinal.state).to.equal('acceptedFinal')
        })
      )
    })
    it('should reject many proposed match2s on-chain', async () => {
      // propose
      const proposalIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'proposal',
        node
      )

      await node.sealBlock()
      await Promise.all(
        proposalIds.map(async (proposal) => {
          await pollTransactionState(db, proposal, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed', 500)
        })
      )

      // reject match2
      const rejectionIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'rejection',
        node,
        200
      )

      // wait for block to finalise
      await node.sealBlock()
      await Promise.all(
        rejectionIds.map(async (rejection) => {
          await pollTransactionState(db, rejection, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match) => {
          await pollMatch2State(db, match, 'rejected', 500)
          const [maybeMatch2Rejected] = await db.getMatch2(match)
          const match2Rejected = maybeMatch2Rejected as Match2Row
          expect(match2Rejected.state).to.equal('rejected')
        })
      )
    })
    it('should reject many acceptedA match2s on-chain', async () => {
      // propose
      const proposalIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'proposal',
        node
      )

      await node.sealBlock()
      await Promise.all(
        proposalIds.map(async (proposal) => {
          await pollTransactionState(db, proposal, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed', 500)
        })
      )
      // submit accept to chain
      const responsesAcceptAIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'accept',
        node
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
          await pollMatch2State(db, match2Id, 'acceptedA', 500)
        })
      )

      const rejectionIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'rejection',
        node,
        200
      )

      await node.sealBlock()
      await Promise.all(
        rejectionIds.map(async (reject) => {
          await pollTransactionState(db, reject, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'rejected')
        })
      )
    })

    it('should cancel many acceptedFinal match2s on-chain', async () => {
      // propose
      const proposalIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'proposal',
        node
      )

      await node.sealBlock()
      await Promise.all(
        proposalIds.map(async (proposal) => {
          await pollTransactionState(db, proposal, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed', 500)
        })
      )
      // submit accept to chain
      const responsesAcceptAIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'accept',
        node
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
          await pollMatch2State(db, match2Id, 'acceptedA', 500)
        })
      )

      // submit 2nd accept to chain
      const responsesAcceptFinalIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'accept',
        node
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
          await pollMatch2State(db, match2Id, 'acceptedFinal', 500)
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
          const [maybeDemandA] = await db.getDemand(demand.demandB)
          const demandA = maybeDemandA as DemandRow
          expect(demandA.state).to.equal('allocated')
        })
      )
      await Promise.all(
        match2Ids.map(async (match) => {
          const [maybeMatch2AcceptFinal] = await db.getMatch2(match)
          const match2AcceptFinal = maybeMatch2AcceptFinal as Match2Row
          expect(match2AcceptFinal.state).to.equal('acceptedFinal')
        })
      )
      // submit a cancellation request
      const data = { attachmentId: parametersAttachmentId }
      const cancelledIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'cancellation',
        node,
        200,
        data
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
          await pollMatch2State(db, match2Id, 'cancelled', 500)
        })
      )
      await Promise.all(
        demandAIds.map(async (demand) => {
          const demandA: DemandRow = await db.getDemand(demand.demandA).then((rows: DemandRow[]) => rows[0])
          expect(demandA).to.deep.contain({
            state: 'cancelled',
          })
        })
      )
      await Promise.all(
        demandBIds.map(async (demand) => {
          const demandB: DemandRow = await db.getDemand(demand.demandB).then((rows: DemandRow[]) => rows[0])
          expect(demandB).to.deep.contain({
            state: 'cancelled',
          })
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          const match2: Match2Row = await db.getMatch2(match2Id).then((rows: Match2Row[]) => rows[0])
          expect(match2).to.deep.contain({
            state: 'cancelled',
          })
        })
      )
    })
  })
  describe('re-match2', async () => {
    let match2Ids: string[] = []
    let demandAIds: demandAId[] = []
    let demandBIds: demandBId[] = []
    let rematch2Ids: string[] = []
    let newDemandBIds: demandBId[] = []

    beforeEach(async () => {
      demandAIds = await processDemandAIds(numberOfRepeats, numberIdsPerBlock, context, node, db)

      //check demand and transaction state
      console.log(`demandA ids length : ${demandAIds.length}`)
      for (const demandA of demandAIds) {
        await pollTransactionState(db, demandA.transactionId, 'finalised')
        await pollDemandState(db, demandA.demandA, 'created')
      }

      demandBIds = await processDemandBIds(numberOfRepeats, numberIdsPerBlock, context, node, db)
      //check demand and transaction state
      for (const demandB of demandBIds) {
        await pollTransactionState(db, demandB.transactionId, 'finalised')
        await pollDemandState(db, demandB.demandB, 'created')
      }

      // check we have 500 demandAs and 500 demandBs
      if (demandAIds.length !== demandBIds.length) {
        console.log(`demandAs: ${demandAIds.length}`)
        console.log(`demandBs: ${demandBIds.length}`)

        throw new Error('Mismatch between demand A and demand B lengths')
      }
      match2Ids = await processMatches2InChunks(demandAIds, demandBIds, numberIdsPerBlock, node, context)

      newDemandBIds = await processDemandBIds(numberOfRepeats, numberIdsPerBlock, context, node, db)

      await node.sealBlock()
      // check demand and transaction state for new demands
      for (const demandB of newDemandBIds) {
        await pollTransactionState(db, demandB.transactionId, 'finalised')
        await pollDemandState(db, demandB.demandB, 'created')
      }

      // check that we have same amount of demandAs and new demandBs
      if (demandAIds.length !== newDemandBIds.length) {
        throw new Error('Mismatch between demand A and new demand B lengths')
      }
    })
    it('should propose a rematch2 on-chain', async () => {
      const transactionIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'proposal',
        node
      )

      await node.sealBlock()
      await Promise.all(
        transactionIds.map(async (tx) => {
          await pollTransactionState(db, tx, 'finalised')
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          await pollMatch2State(db, match2Id, 'proposed', 500)
        })
      )
      await Promise.all(
        match2Ids.map(async (match2Id) => {
          const [maybeMatch2] = await db.getMatch2(match2Id)
          const match2 = maybeMatch2 as Match2Row
          expect(match2.state).to.equal('proposed')
        })
      )
      const responsesAcceptAIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'accept',
        node
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
          await pollMatch2State(db, match2Id, 'acceptedA', 500)
        })
      )

      // submit 2nd accept to chain
      const responsesAcceptFinalIds = await processMatch2TransactionsInChunks(
        match2Ids,
        numberIdsPerBlock,
        context,
        'accept',
        node
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
          await pollMatch2State(db, match2Id, 'acceptedFinal', 500)
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
      rematch2Ids = await processMatches2InChunks(
        demandAIds,
        newDemandBIds,
        numberIdsPerBlock,
        node,
        context,
        match2Ids
      )

      await node.sealBlock()
      //submit rematches to chain
      const proposedRematch2Ids = await processMatch2TransactionsInChunks(
        rematch2Ids,
        numberIdsPerBlock,
        context,
        'proposal',
        node
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
          await pollMatch2State(db, rematch2Id, 'proposed', 500)
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
    it.skip('accepts a rematch2 proposal', async () => {
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
