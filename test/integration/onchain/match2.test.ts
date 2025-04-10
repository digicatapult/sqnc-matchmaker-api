import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { post, get } from '../../helper/routeHelper.js'
import { cleanup } from '../../seeds/onchainSeeds/onchain.match2.seed.js'
import {
  MockDispatcherContext,
  parametersAttachmentId,
  withAttachmentMock,
  withDispatcherMock,
  withIdentitySelfMock,
} from '../../helper/mock.js'
import Database from '../../../src/lib/db/index.js'
import { pollDemandState, pollMatch2State, pollTransactionState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { UUID } from '../../../src/models/strings.js'
import { container } from 'tsyringe'
import { withProxy } from '../../helper/proxy.js'
import { logger } from '../../../src/lib/logger.js'
import ExtendedChainNode from '../../helper/testInstanceChainNode.js'
import env from '../../../src/env.js'
import { DemandRow, Match2Row } from '../../../src/lib/db/types.js'
import { TransactionResponse } from '../../../src/models/transaction.js'

describe('on-chain', function () {
  this.timeout(180000)
  const db = container.resolve(Database)
  const node = new ExtendedChainNode(logger, env)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }
  const mock: MockDispatcherContext = {} as MockDispatcherContext

  withAppAndIndexer(context)
  withDispatcherMock(mock)
  withIdentitySelfMock(mock)
  withAttachmentMock(mock)
  withProxy(node)

  afterEach(async () => await cleanup())

  describe('match2', async () => {
    let ids: {
      originalDemandB: number
      originalDemandA: number
      demandA: UUID
      demandB: UUID
      newDemandB: UUID
      match2: UUID
      rematch2?: UUID
    }

    beforeEach(async () => {
      const {
        body: { id: demandAId },
      } = await post(context.app, '/v1/demandA', { parametersAttachmentId })
      const {
        body: { id: demandATransactionId },
      } = await post(context.app, `/v1/demandA/${demandAId}/creation`, {})
      const {
        body: { id: demandBId },
      } = await post(context.app, '/v1/demandB', { parametersAttachmentId })
      const {
        body: { id: demandBTransactionId },
      } = await post(context.app, `/v1/demandB/${demandBId}/creation`, {})

      await node.sealBlock()
      await pollTransactionState(db, demandATransactionId, 'finalised')
      await pollDemandState(db, demandAId, 'created')

      const [demandA] = await db.get('demand', { id: demandAId })

      await node.sealBlock()
      await pollTransactionState(db, demandBTransactionId, 'finalised')
      await pollDemandState(db, demandBId, 'created')

      const [demandB] = await db.get('demand', { id: demandBId })

      //additional demandB for testing rematch2 flow
      const {
        body: { id: newDemandBId },
      } = await post(context.app, '/v1/demandB', { parametersAttachmentId })
      const {
        body: { id: newDemandBTransactionId },
      } = await post(context.app, `/v1/demandB/${newDemandBId}/creation`, {})

      await node.sealBlock()
      await pollTransactionState(db, newDemandBTransactionId, 'finalised')
      await pollDemandState(db, newDemandBId, 'created')

      const {
        body: { id: match2Id },
      } = await post(context.app, '/v1/match2', { demandA: demandA.id, demandB: demandB.id })

      ids = {
        originalDemandB: demandB.original_token_id as number,
        originalDemandA: demandA.original_token_id as number,
        demandA: demandAId,
        demandB: demandBId,
        match2: match2Id,
        newDemandB: newDemandBId,
      }
    })

    it('should propose a match2 on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const response = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, transactionId, 'finalised')
      await pollMatch2State(db, ids.match2, 'proposed')

      // check local entities update with token id
      const [maybeDemandA] = await db.get('demand', { id: ids.demandA })
      const demandA = maybeDemandA as DemandRow
      expect(demandA.latest_token_id).to.equal(lastTokenId + 1)
      expect(demandA.original_token_id).to.equal(ids.originalDemandA)

      const [maybeDemandB] = await db.get('demand', { id: ids.demandB })
      const demandB = maybeDemandB as DemandRow
      expect(demandB.latest_token_id).to.equal(lastTokenId + 2)
      expect(demandB.original_token_id).to.equal(ids.originalDemandB)

      const [maybeMatch2] = await db.get('match2', { id: ids.match2 })
      const match2 = maybeMatch2 as Match2Row
      expect(match2.latest_token_id).to.equal(lastTokenId + 3)
      expect(match2.original_token_id).to.equal(lastTokenId + 3)
    })

    it('should propose + accept + reject a match2 on-chain - scope', async () => {
      const { status, body } = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {}, {}, `match2:propose`)
      expect(status).to.equal(201)

      await node.sealBlock()
      await pollTransactionState(db, body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'proposed')

      const responseAcceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {}, {}, `match2:accept`)
      expect(responseAcceptA.status).to.equal(201)

      await node.sealBlock()
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedA')

      const rejection = await post(context.app, `/v1/match2/${ids.match2}/rejection`, {}, {}, `match2:reject`)
      expect(rejection.status).to.equal(200)
    })

    it('should propose + accept + cancel a match2 on-chain - scope', async () => {
      const { status, body } = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {}, {}, `match2:propose`)
      expect(status).to.equal(201)

      await node.sealBlock()
      await pollTransactionState(db, body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'proposed')

      const responseAcceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {}, {}, `match2:accept`)
      expect(responseAcceptA.status).to.equal(201)

      await node.sealBlock()
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedA')

      const responseAcceptFinal = await post(context.app, `/v1/match2/${ids.match2}/accept`, {}, {}, `match2:accept`)
      expect(responseAcceptFinal.status).to.equal(201)

      await node.sealBlock()
      await pollTransactionState(db, responseAcceptFinal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedFinal')

      const data = { attachmentId: parametersAttachmentId }
      const cancellation = await post(context.app, `/v1/match2/${ids.match2}/cancellation`, data, {}, `match2:cancel`)
      expect(cancellation.status).to.equal(200)
    })

    it('should propose a rematch2 on-chain', async () => {
      //prepare acceptedFinal match2
      // propose
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, proposal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'proposed')

      // submit accept to chain
      const responseAcceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedA')

      // submit 2nd accept to chain
      const responseAcceptFinal = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, responseAcceptFinal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedFinal')

      const lastTokenId = await node.getLastTokenId()

      //prepare rematch
      const reMatch = await post(context.app, '/v1/match2', {
        demandA: ids.demandA,
        demandB: ids.newDemandB,
        replaces: ids.match2,
      })
      ids.rematch2 = reMatch.body['id']

      // submit to chain
      const response = await post(context.app, `/v1/match2/${ids.rematch2}/proposal`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, transactionId, 'finalised')
      await pollMatch2State(db, ids.rematch2 as UUID, 'proposed')

      // check local entities update with token id
      const [maybeDemandA] = await db.get('demand', { id: ids.demandA })
      const demandA = maybeDemandA as DemandRow
      expect(demandA.state).to.equal('allocated')
      expect(demandA.latest_token_id).to.equal(lastTokenId + 1)
      expect(demandA.original_token_id).to.equal(ids.originalDemandA)

      const [maybeOldMatch2] = await db.get('match2', { id: ids.match2 })
      const oldMatch2 = maybeOldMatch2 as Match2Row
      expect(oldMatch2.state).to.equal('acceptedFinal')
      expect(oldMatch2.latest_token_id).to.equal(lastTokenId + 2)

      const [maybeNewDemandB] = await db.get('demand', { id: ids.newDemandB })
      const newDemandB = maybeNewDemandB as DemandRow
      expect(newDemandB.state).to.equal('created')
      expect(newDemandB.latest_token_id).to.equal(lastTokenId + 3)

      if (!ids.rematch2) {
        expect.fail('Rematch 2 token must have been created')
      }
      const [maybereMatch2] = await db.get('match2', { id: ids.rematch2 })
      const rematch2 = maybereMatch2 as Match2Row
      expect(rematch2.state).to.equal('proposed')
      expect(rematch2.latest_token_id).to.equal(lastTokenId + 4)
    })

    it('accepts a rematch2 proposal', async () => {
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})
      await node.sealBlock()
      await pollTransactionState(db, proposal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'proposed')

      const resAcceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})

      await node.sealBlock()
      await pollTransactionState(db, resAcceptA.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedA')

      const resAcceptFinal = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})

      await node.sealBlock()
      await pollTransactionState(db, resAcceptFinal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedFinal')

      const reMatch = await post(context.app, '/v1/match2', {
        demandA: ids.demandA,
        demandB: ids.newDemandB,
        replaces: ids.match2,
      })
      ids.rematch2 = reMatch.body['id'] as UUID

      const resProposal = await post(context.app, `/v1/match2/${ids.rematch2}/proposal`, {})

      await node.sealBlock()
      await pollTransactionState(db, resProposal.body.id, 'finalised')
      await pollMatch2State(db, ids.rematch2, 'proposed')

      const resRematchAccept = await post(context.app, `/v1/match2/${ids.rematch2}/accept`, {})

      await node.sealBlock()
      await pollTransactionState(db, resRematchAccept.body.id, 'finalised')
      await pollMatch2State(db, ids.rematch2, 'acceptedA')

      const lastTokenId = await node.getLastTokenId()
      const resFinal = await post(context.app, `/v1/match2/${ids.rematch2}/accept`, {})

      await node.sealBlock()
      await pollTransactionState(db, resFinal.body.id, 'finalised')
      await pollMatch2State(db, ids.rematch2, 'acceptedFinal')

      // output
      const [match2]: Match2Row[] = await db.get('match2', { id: ids.match2 })
      const [demandA] = await db.get('demand', { id: ids.demandA })
      const [demandB] = await db.get('demand', { id: match2.demand_b_id })
      const [newDemandB] = await db.get('demand', { id: ids.newDemandB })
      const [rematch2]: Match2Row[] = await db.get('match2', { id: ids.rematch2 })

      expect(demandA.state).to.equal('allocated')
      expect(demandA.latest_token_id).to.equal(lastTokenId + 1)
      expect(demandA.original_token_id).to.equal(ids.originalDemandA)

      expect(demandB.state).to.equal('cancelled')
      expect(demandB.latest_token_id).to.equal(lastTokenId + 2)

      expect(match2.state).to.equal('cancelled')
      expect(match2.latest_token_id).to.equal(lastTokenId + 3)

      expect(newDemandB.state).to.equal('allocated')
      expect(newDemandB.latest_token_id).to.equal(lastTokenId + 4)

      expect(rematch2.state).to.equal('acceptedFinal')
      expect(rematch2.latest_token_id).to.equal(lastTokenId + 5)
    })

    describe('if multiple accepts have been submitted', () => {
      it('handles error and marks only one transaction finalised and others as failed', async () => {
        const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})

        await node.sealBlock()
        await pollTransactionState(db, proposal.body.id, 'finalised')
        await pollMatch2State(db, ids.match2, 'proposed')

        const acceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})
        await post(context.app, `/v1/match2/${ids.match2}/accept`, {})

        await node.sealBlock()
        await pollTransactionState(db, acceptA.body.id, 'finalised')
        await pollMatch2State(db, ids.match2, 'acceptedA')

        const { body: transactions } = await get(context.app, `/v1/match2/${ids.match2}/accept`)
        const failed = transactions.filter((el: TransactionResponse) => el.state === 'failed')
        const finalised = transactions.filter((el: TransactionResponse) => el.state === 'finalised')

        expect(transactions.length).to.equal(2)
        expect(failed[0]).to.deep.include({
          state: 'failed',
          localId: ids.match2,
          apiType: 'match2',
          transactionType: 'accept',
        })
        expect(finalised[0]).to.deep.include({
          state: 'finalised',
          localId: ids.match2,
          apiType: 'match2',
          transactionType: 'accept',
        })
      })
    })

    it('should acceptA then acceptFinal a match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, proposal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'proposed')

      const [maybeMatch2] = await db.get('match2', { id: ids.match2 })
      const match2 = maybeMatch2 as Match2Row
      const match2OriginalId = match2.original_token_id
      const lastTokenId = await node.getLastTokenId()

      // submit accept to chain
      const responseAcceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})
      expect(responseAcceptA.status).to.equal(201)

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedA')

      // check local entities update with token id
      const [maybeMatch2AcceptA] = await db.get('match2', { id: ids.match2 })
      const match2AcceptA = maybeMatch2AcceptA as Match2Row
      expect(match2AcceptA.latest_token_id).to.equal(lastTokenId + 1)
      expect(match2AcceptA.state).to.equal('acceptedA')
      expect(match2AcceptA.original_token_id).to.equal(match2OriginalId)

      // submit 2nd accept to chain
      const responseAcceptFinal = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})
      expect(responseAcceptFinal.status).to.equal(201)

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, responseAcceptFinal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedFinal')

      // check local entities update with token id
      const [maybeDemandA] = await db.get('demand', { id: ids.demandA })
      const demandA = maybeDemandA as DemandRow
      expect(demandA.latest_token_id).to.equal(lastTokenId + 2)
      expect(demandA.state).to.equal('allocated')
      expect(demandA.original_token_id).to.equal(ids.originalDemandA)

      const [maybeDemandB] = await db.get('demand', { id: ids.demandB })
      const demandB = maybeDemandB as DemandRow
      expect(demandB.latest_token_id).to.equal(lastTokenId + 3)
      expect(demandB.state).to.equal('allocated')
      expect(demandB.original_token_id).to.equal(ids.originalDemandB)

      const [maybeMatch2AcceptFinal] = await db.get('match2', { id: ids.match2 })
      const match2AcceptFinal = maybeMatch2AcceptFinal as Match2Row
      expect(match2AcceptFinal.latest_token_id).to.equal(lastTokenId + 4)
      expect(match2AcceptFinal.state).to.equal('acceptedFinal')
      expect(match2AcceptFinal.original_token_id).to.equal(match2OriginalId)
    })

    it('should reject a proposed match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})
      expect(proposal.status).to.equal(201)

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, proposal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'proposed')

      const [maybeMatch2] = await db.get('match2', { id: ids.match2 })
      const match2 = maybeMatch2 as Match2Row
      const match2LatestTokenId = match2.latest_token_id

      // reject match2
      const rejection = await post(context.app, `/v1/match2/${ids.match2}/rejection`, {})
      expect(rejection.status).to.equal(200)

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, rejection.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'rejected')

      // check local entities update with token id
      const [maybeMatch2Rejected] = await db.get('match2', { id: ids.match2 })
      const match2Rejected = maybeMatch2Rejected as Match2Row
      expect(match2Rejected.state).to.equal('rejected')

      // no output token means latest token ID remains the same
      expect(match2Rejected.latest_token_id).to.equal(match2LatestTokenId)
    })

    it('should reject an acceptedA match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})
      expect(proposal.status).to.equal(201)

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, proposal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'proposed')

      // acceptA
      const acceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})
      expect(acceptA.status).to.equal(201)

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, acceptA.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedA')

      const [maybeMatch2] = await db.get('match2', { id: ids.match2 })
      const match2 = maybeMatch2 as Match2Row
      const match2LatestTokenId = match2.latest_token_id

      // reject match2
      const rejection = await post(context.app, `/v1/match2/${ids.match2}/rejection`, {})
      expect(rejection.status).to.equal(200)

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, rejection.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'rejected')

      // check local entities update with token id
      const [maybeMatch2Rejected] = await db.get('match2', { id: ids.match2 })
      const match2Rejected = maybeMatch2Rejected as Match2Row
      expect(match2Rejected.state).to.equal('rejected')

      // no output token means latest token ID remains the same
      expect(match2Rejected.latest_token_id).to.equal(match2LatestTokenId)
    })

    it('should cancel an acceptedFinal match2 on-chain', async () => {
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})

      await node.sealBlock()
      await pollTransactionState(db, proposal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'proposed')

      const { original_token_id } = await db.get('match2', { id: ids.match2 }).then((el) => el[0])

      const acceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})

      await node.sealBlock()
      await pollTransactionState(db, acceptA.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedA')

      const acceptFinal = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})

      await node.sealBlock()
      await pollTransactionState(db, acceptFinal.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'acceptedFinal')

      const lastTokenId = await node.getLastTokenId()

      // submit a cancellation request
      const data = { attachmentId: parametersAttachmentId }
      const cancel = await post(context.app, `/v1/match2/${ids.match2}/cancellation`, data)

      await node.sealBlock()
      await pollTransactionState(db, cancel.body.id, 'finalised')
      await pollMatch2State(db, ids.match2, 'cancelled')

      const demandA: DemandRow = await db.get('demand', { id: ids.demandA }).then((rows) => rows[0])
      const demandB: DemandRow = await db.get('demand', { id: ids.demandB }).then((rows) => rows[0])
      const match2: Match2Row = await db.get('match2', { id: ids.match2 }).then((rows) => rows[0])
      expect(cancel.status).to.equal(200)
      expect(demandA).to.deep.contain({
        latest_token_id: lastTokenId + 1,
        state: 'cancelled',
      })
      expect(demandB).to.deep.contain({
        latest_token_id: lastTokenId + 2,
        state: 'cancelled',
      })
      expect(match2).to.deep.contain({
        latest_token_id: lastTokenId + 3,
        state: 'cancelled',
        demand_a_id: demandA.id,
        demand_b_id: demandB.id,
        original_token_id,
      })
    })
  })
})
