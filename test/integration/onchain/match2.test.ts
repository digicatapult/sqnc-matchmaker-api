import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer'
import { post } from '../../helper/routeHelper'
import { seed, cleanup, parametersAttachmentId } from '../../seeds/onchainSeeds/onchain.match2.seed'

import { withIdentitySelfMock } from '../../helper/mock'
import Database, { DemandRow, Match2Row } from '../../../src/lib/db'
import ChainNode from '../../../src/lib/chainNode'
import { logger } from '../../../src/lib/logger'
import env from '../../../src/env'
import { pollTransactionState } from '../../helper/poll'
import { withAppAndIndexer } from '../../helper/chainTest'
import { UUID } from '../../../src/models/strings'

describe('on-chain', function () {
  this.timeout(120000)
  const db = new Database()
  const node = new ChainNode({
    host: env.NODE_HOST,
    port: env.NODE_PORT,
    logger,
    userUri: env.USER_URI,
  })
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }

  withAppAndIndexer(context)

  withIdentitySelfMock()

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

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
      // prepare an unallocated demandA + demandB + local match2
      //prepare additional demandB to use in the rematch2 flow

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

      await pollTransactionState(db, demandATransactionId, 'finalised')
      const [demandA]: DemandRow[] = await db.getDemand(demandAId)
      await pollTransactionState(db, demandBTransactionId, 'finalised')
      const [demandB]: DemandRow[] = await db.getDemand(demandBId)

      //additional demandB for testing rematch2 flow
      const {
        body: { id: newDemandBId },
      } = await post(context.app, '/v1/demandB', { parametersAttachmentId })
      const {
        body: { id: newDemandBTransactionId },
      } = await post(context.app, `/v1/demandB/${newDemandBId}/creation`, {})

      await pollTransactionState(db, newDemandBTransactionId, 'finalised')

      const {
        body: { id: match2Id },
      } = await post(context.app, '/v1/match2', { demandA: demandA.id, demandB: demandB.id })

      ids = {
        originalDemandB: demandB.originalTokenId as number,
        originalDemandA: demandA.originalTokenId as number,
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
      await pollTransactionState(db, transactionId, 'finalised')

      // check local entities update with token id
      const [maybeDemandA] = await db.getDemand(ids.demandA)
      const demandA = maybeDemandA as DemandRow
      expect(demandA.latestTokenId).to.equal(lastTokenId + 1)
      expect(demandA.originalTokenId).to.equal(ids.originalDemandA)

      const [maybeDemandB] = await db.getDemand(ids.demandB)
      const demandB = maybeDemandB as DemandRow
      expect(demandB.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandB.originalTokenId).to.equal(ids.originalDemandB)

      const [maybeMatch2] = await db.getMatch2(ids.match2)
      const match2 = maybeMatch2 as Match2Row
      expect(match2.latestTokenId).to.equal(lastTokenId + 3)
      expect(match2.originalTokenId).to.equal(lastTokenId + 3)
    })

    it('should propose a rematch2 on-chain', async () => {
      //prepare acceptedFinal match2
      // propose
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      // submit accept to chain
      const responseAcceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')

      // submit 2nd accept to chain
      const responseAcceptFinal = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptFinal.body.id, 'finalised')

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
      await pollTransactionState(db, transactionId, 'finalised')

      // check local entities update with token id
      const [maybeDemandA] = await db.getDemand(ids.demandA)
      const demandA = maybeDemandA as DemandRow
      expect(demandA.state).to.equal('allocated')
      expect(demandA.latestTokenId).to.equal(lastTokenId + 1)
      expect(demandA.originalTokenId).to.equal(ids.originalDemandA)

      const [maybeOldMatch2] = await db.getMatch2(ids.match2)
      const oldMatch2 = maybeOldMatch2 as Match2Row
      expect(oldMatch2.state).to.equal('acceptedFinal')
      expect(oldMatch2.latestTokenId).to.equal(lastTokenId + 2)

      const [maybeNewDemandB] = await db.getDemand(ids.newDemandB)
      const newDemandB = maybeNewDemandB as DemandRow
      expect(newDemandB.state).to.equal('created')
      expect(newDemandB.latestTokenId).to.equal(lastTokenId + 3)

      if (!ids.rematch2) {
        expect.fail('Rematch 2 token must have been created')
      }
      const [maybereMatch2] = await db.getMatch2(ids.rematch2)
      const rematch2 = maybereMatch2 as Match2Row
      expect(rematch2.state).to.equal('proposed')
      expect(rematch2.latestTokenId).to.equal(lastTokenId + 4)
    })

    it('should acceptA then acceptFinal a match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      const [maybeMatch2] = await db.getMatch2(ids.match2)
      const match2 = maybeMatch2 as Match2Row
      const match2OriginalId = match2.originalTokenId
      const lastTokenId = await node.getLastTokenId()

      // submit accept to chain
      const responseAcceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})
      expect(responseAcceptA.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')

      // check local entities update with token id
      const [maybeMatch2AcceptA] = await db.getMatch2(ids.match2)
      const match2AcceptA = maybeMatch2AcceptA as Match2Row
      expect(match2AcceptA.latestTokenId).to.equal(lastTokenId + 1)
      expect(match2AcceptA.state).to.equal('acceptedA')
      expect(match2AcceptA.originalTokenId).to.equal(match2OriginalId)

      // submit 2nd accept to chain
      const responseAcceptFinal = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})
      expect(responseAcceptFinal.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptFinal.body.id, 'finalised')

      // check local entities update with token id
      const [maybeDemandA] = await db.getDemand(ids.demandA)
      const demandA = maybeDemandA as DemandRow
      expect(demandA.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandA.state).to.equal('allocated')
      expect(demandA.originalTokenId).to.equal(ids.originalDemandA)

      const [maybeDemandB] = await db.getDemand(ids.demandB)
      const demandB = maybeDemandB as DemandRow
      expect(demandB.latestTokenId).to.equal(lastTokenId + 3)
      expect(demandB.state).to.equal('allocated')
      expect(demandB.originalTokenId).to.equal(ids.originalDemandB)

      const [maybeMatch2AcceptFinal] = await db.getMatch2(ids.match2)
      const match2AcceptFinal = maybeMatch2AcceptFinal as Match2Row
      expect(match2AcceptFinal.latestTokenId).to.equal(lastTokenId + 4)
      expect(match2AcceptFinal.state).to.equal('acceptedFinal')
      expect(match2AcceptFinal.originalTokenId).to.equal(match2OriginalId)
    })

    it('should reject a proposed match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})
      expect(proposal.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      const [maybeMatch2] = await db.getMatch2(ids.match2)
      const match2 = maybeMatch2 as Match2Row
      const match2LatestTokenId = match2.latestTokenId

      // reject match2
      const rejection = await post(context.app, `/v1/match2/${ids.match2}/rejection`, {})
      expect(rejection.status).to.equal(200)

      // wait for block to finalise
      await pollTransactionState(db, rejection.body.id, 'finalised')

      // check local entities update with token id
      const [maybeMatch2Rejected] = await db.getMatch2(ids.match2)
      const match2Rejected = maybeMatch2Rejected as Match2Row
      expect(match2Rejected.state).to.equal('rejected')

      // no output token means latest token ID remains the same
      expect(match2Rejected.latestTokenId).to.equal(match2LatestTokenId)
    })

    it('should reject an acceptedA match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})
      expect(proposal.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      // acceptA
      const acceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})
      expect(acceptA.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, acceptA.body.id, 'finalised')

      const [maybeMatch2] = await db.getMatch2(ids.match2)
      const match2 = maybeMatch2 as Match2Row
      const match2LatestTokenId = match2.latestTokenId

      // reject match2
      const rejection = await post(context.app, `/v1/match2/${ids.match2}/rejection`, {})
      expect(rejection.status).to.equal(200)

      // wait for block to finalise
      await pollTransactionState(db, rejection.body.id, 'finalised')

      // check local entities update with token id
      const [maybeMatch2Rejected] = await db.getMatch2(ids.match2)
      const match2Rejected = maybeMatch2Rejected as Match2Row
      expect(match2Rejected.state).to.equal('rejected')

      // no output token means latest token ID remains the same
      expect(match2Rejected.latestTokenId).to.equal(match2LatestTokenId)
    })

    it('should cancel an acceptedFinal match2 on-chain', async () => {
      const proposal = await post(context.app, `/v1/match2/${ids.match2}/proposal`, {})
      await pollTransactionState(db, proposal.body.id, 'finalised')
      const { originalTokenId } = await db.getMatch2(ids.match2).then((el: Match2Row[]) => el[0])

      const acceptA = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})
      await pollTransactionState(db, acceptA.body.id, 'finalised')
      const acceptFinal = await post(context.app, `/v1/match2/${ids.match2}/accept`, {})
      await pollTransactionState(db, acceptFinal.body.id, 'finalised')
      const lastTokenId = await node.getLastTokenId()

      // submit a cancellation request
      const data = { attachmentId: parametersAttachmentId }
      const cancel = await post(context.app, `/v1/match2/${ids.match2}/cancellation`, data)
      await pollTransactionState(db, cancel.body.id, 'finalised')

      const demandA: DemandRow = await db.getDemand(ids.demandA).then((rows: DemandRow[]) => rows[0])
      const demandB: DemandRow = await db.getDemand(ids.demandB).then((rows: DemandRow[]) => rows[0])
      const match2: Match2Row = await db.getMatch2(ids.match2).then((rows: Match2Row[]) => rows[0])
      expect(cancel.status).to.equal(200)
      expect(demandA).to.deep.contain({
        latestTokenId: lastTokenId + 1,
        state: 'cancelled',
      })
      expect(demandB).to.deep.contain({
        latestTokenId: lastTokenId + 2,
        state: 'cancelled',
      })
      expect(match2).to.deep.contain({
        latestTokenId: lastTokenId + 3,
        state: 'cancelled',
        demandA: demandA.id,
        demandB: demandB.id,
        originalTokenId,
      })
    })
  })
})
