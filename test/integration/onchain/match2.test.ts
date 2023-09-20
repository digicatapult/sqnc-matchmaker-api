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
  this.timeout(60000)
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
    let demandAOriginalId: number
    let demandBOriginalId: number
    let demandALocalId: UUID
    let demandBLocalId: UUID
    let match2LocalId: UUID

    beforeEach(async () => {
      // prepare an unallocated demandA + demandB + local match2

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
      const [maybeDemandA] = await db.getDemand(demandAId)
      const demandA = maybeDemandA as DemandRow
      demandALocalId = demandAId
      demandAOriginalId = demandA.originalTokenId as number

      await pollTransactionState(db, demandBTransactionId, 'finalised')
      const [maybeDemandB] = await db.getDemand(demandBId)
      const demandB = maybeDemandB as DemandRow
      demandBLocalId = demandBId
      demandBOriginalId = demandB.originalTokenId as number

      const {
        body: { id: match2Id },
      } = await post(context.app, '/v1/match2', { demandA: demandAId, demandB: demandBId })
      match2LocalId = match2Id
    })

    it('should propose a match2 on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const response = await post(context.app, `/v1/match2/${match2LocalId}/proposal`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      // wait for block to finalise
      await pollTransactionState(db, transactionId, 'finalised')

      // check local entities update with token id
      const [maybeDemandA] = await db.getDemand(demandALocalId)
      const demandA = maybeDemandA as DemandRow
      expect(demandA.latestTokenId).to.equal(lastTokenId + 1)
      expect(demandA.originalTokenId).to.equal(demandAOriginalId)

      const [maybeDemandB] = await db.getDemand(demandBLocalId)
      const demandB = maybeDemandB as DemandRow
      expect(demandB.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandB.originalTokenId).to.equal(demandBOriginalId)

      const [maybeMatch2] = await db.getMatch2(match2LocalId)
      const match2 = maybeMatch2 as Match2Row
      expect(match2.latestTokenId).to.equal(lastTokenId + 3)
      expect(match2.originalTokenId).to.equal(lastTokenId + 3)
    })

    it('should acceptA then acceptFinal a match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${match2LocalId}/proposal`, {})

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      const [maybeMatch2] = await db.getMatch2(match2LocalId)
      const match2 = maybeMatch2 as Match2Row
      const match2OriginalId = match2.originalTokenId
      const lastTokenId = await node.getLastTokenId()

      // submit accept to chain
      const responseAcceptA = await post(context.app, `/v1/match2/${match2LocalId}/accept`, {})
      expect(responseAcceptA.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')

      // check local entities update with token id
      const [maybeMatch2AcceptA] = await db.getMatch2(match2LocalId)
      const match2AcceptA = maybeMatch2AcceptA as Match2Row
      expect(match2AcceptA.latestTokenId).to.equal(lastTokenId + 1)
      expect(match2AcceptA.state).to.equal('acceptedA')
      expect(match2AcceptA.originalTokenId).to.equal(match2OriginalId)

      // submit 2nd accept to chain
      const responseAcceptFinal = await post(context.app, `/v1/match2/${match2LocalId}/accept`, {})
      expect(responseAcceptFinal.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptFinal.body.id, 'finalised')

      // check local entities update with token id
      const [maybeDemandA] = await db.getDemand(demandALocalId)
      const demandA = maybeDemandA as DemandRow
      expect(demandA.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandA.state).to.equal('allocated')
      expect(demandA.originalTokenId).to.equal(demandAOriginalId)

      const [maybeDemandB] = await db.getDemand(demandBLocalId)
      const demandB = maybeDemandB as DemandRow
      expect(demandB.latestTokenId).to.equal(lastTokenId + 3)
      expect(demandB.state).to.equal('allocated')
      expect(demandB.originalTokenId).to.equal(demandBOriginalId)

      const [maybeMatch2AcceptFinal] = await db.getMatch2(match2LocalId)
      const match2AcceptFinal = maybeMatch2AcceptFinal as Match2Row
      expect(match2AcceptFinal.latestTokenId).to.equal(lastTokenId + 4)
      expect(match2AcceptFinal.state).to.equal('acceptedFinal')
      expect(match2AcceptFinal.originalTokenId).to.equal(match2OriginalId)
    })

    it('should reject a proposed match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${match2LocalId}/proposal`, {})
      expect(proposal.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      const [maybeMatch2] = await db.getMatch2(match2LocalId)
      const match2 = maybeMatch2 as Match2Row
      const match2LatestTokenId = match2.latestTokenId

      // reject match2
      const rejection = await post(context.app, `/v1/match2/${match2LocalId}/rejection`, {})
      expect(rejection.status).to.equal(200)

      // wait for block to finalise
      await pollTransactionState(db, rejection.body.id, 'finalised')

      // check local entities update with token id
      const [maybeMatch2Rejected] = await db.getMatch2(match2LocalId)
      const match2Rejected = maybeMatch2Rejected as Match2Row
      expect(match2Rejected.state).to.equal('rejected')

      // no output token means latest token ID remains the same
      expect(match2Rejected.latestTokenId).to.equal(match2LatestTokenId)
    })

    it('should reject an acceptedA match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${match2LocalId}/proposal`, {})
      expect(proposal.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      // acceptA
      const acceptA = await post(context.app, `/v1/match2/${match2LocalId}/accept`, {})
      expect(acceptA.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, acceptA.body.id, 'finalised')

      const [maybeMatch2] = await db.getMatch2(match2LocalId)
      const match2 = maybeMatch2 as Match2Row
      const match2LatestTokenId = match2.latestTokenId

      // reject match2
      const rejection = await post(context.app, `/v1/match2/${match2LocalId}/rejection`, {})
      expect(rejection.status).to.equal(200)

      // wait for block to finalise
      await pollTransactionState(db, rejection.body.id, 'finalised')

      // check local entities update with token id
      const [maybeMatch2Rejected] = await db.getMatch2(match2LocalId)
      const match2Rejected = maybeMatch2Rejected as Match2Row
      expect(match2Rejected.state).to.equal('rejected')

      // no output token means latest token ID remains the same
      expect(match2Rejected.latestTokenId).to.equal(match2LatestTokenId)
    })

    it('should cancel an acceptedFinal match2 on-chain', async () => {
      // propose
      const proposal = await post(context.app, `/v1/match2/${match2LocalId}/proposal`, {})

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      const [maybeMatch2] = await db.getMatch2(match2LocalId)
      const match2 = maybeMatch2 as Match2Row
      const match2OriginalId = match2.originalTokenId
      const lastTokenId = await node.getLastTokenId()

      // submit accept to chain
      const responseAcceptA = await post(context.app, `/v1/match2/${match2LocalId}/accept`, {})
      expect(responseAcceptA.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')

      // check local entities update with token id
      const [maybeMatch2AcceptA] = await db.getMatch2(match2LocalId)
      const match2AcceptA = maybeMatch2AcceptA as Match2Row
      expect(match2AcceptA.latestTokenId).to.equal(lastTokenId + 1)
      expect(match2AcceptA.state).to.equal('acceptedA')
      expect(match2AcceptA.originalTokenId).to.equal(match2OriginalId)

      // submit 2nd accept to chain
      const responseAcceptFinal = await post(context.app, `/v1/match2/${match2LocalId}/accept`, {})
      expect(responseAcceptFinal.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptFinal.body.id, 'finalised')

      const cancellation = await post(context.app, `/v1/match2/${match2LocalId}/cancellation`, {
        attachmentId: parametersAttachmentId,
      })
      expect(cancellation.status).to.equal(200)
      console.log(cancellation.status, cancellation.body)

      // wait for block to finalise
      await pollTransactionState(db, cancellation.body.id, 'finalised')
      console.log('here')

      // check local entities update with token id
      const [maybeDemandA] = await db.getDemand(demandALocalId)
      console.log('and there')
      const demandA = maybeDemandA as DemandRow
      console.log(`latest token id: ${demandA.latestTokenId}`)
      console.log(`last token id: ${lastTokenId}`)
      expect(demandA.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandA.state).to.equal('cancelled')
      expect(demandA.originalTokenId).to.equal(demandAOriginalId)

      const [maybeDemandB] = await db.getDemand(demandBLocalId)
      const demandB = maybeDemandB as DemandRow
      expect(demandB.latestTokenId).to.equal(lastTokenId + 3)
      expect(demandB.state).to.equal('cancelled')
      expect(demandB.originalTokenId).to.equal(demandBOriginalId)

      const [maybeMatch2AcceptFinal] = await db.getMatch2(match2LocalId)
      // console.log(maybeMatch2AcceptFinal)
      const match2AcceptFinal = maybeMatch2AcceptFinal as Match2Row
      expect(match2AcceptFinal.latestTokenId).to.equal(lastTokenId + 4)
      expect(match2AcceptFinal.state).to.equal('cancelled')
      expect(match2AcceptFinal.originalTokenId).to.equal(match2OriginalId)
    })
  })
})
