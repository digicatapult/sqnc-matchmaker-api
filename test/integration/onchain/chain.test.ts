import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server'
import Indexer from '../../../src/lib/indexer'
import { post } from '../../helper/routeHelper'
import { seed, cleanup, seededDemandBId, parametersAttachmentId } from '../../seeds'

import { withIdentitySelfMock } from '../../helper/mock'
import Database from '../../../src/lib/db'
import ChainNode from '../../../src/lib/chainNode'
import { logger } from '../../../src/lib/logger'
import env from '../../../src/env'
import { UUID } from '../../../src/models/strings'
import { pollTransactionState } from '../../helper/poll'

const db = new Database()
const node = new ChainNode({
  host: env.NODE_HOST,
  port: env.NODE_PORT,
  logger,
  userUri: env.USER_URI,
})

describe('on-chain', function () {
  this.timeout(60000)
  let app: Express
  let indexer: Indexer

  before(async function () {
    app = await createHttpServer()
    const node = new ChainNode({
      host: env.NODE_HOST,
      port: env.NODE_PORT,
      logger,
      userUri: env.USER_URI,
    })

    const blockHash = await node.getLastFinalisedBlockHash()
    const blockHeader = await node.getHeader(blockHash)
    await db
      .insertProcessedBlock({
        hash: blockHash,
        height: blockHeader.height,
        parent: blockHash,
      })
      .catch(() => {
        // intentional ignorance of errors
      })

    indexer = new Indexer({ db: new Database(), logger, node })
    await indexer.start()
    indexer.processAllBlocks(await node.getLastFinalisedBlockHash()).then(() =>
      node.watchFinalisedBlocks(async (hash) => {
        await indexer.processAllBlocks(hash)
      })
    )
  })

  after(async function () {
    await indexer.close()
  })

  withIdentitySelfMock()

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('chainNode', () => {
    it('should set transaction as failed if dispatch error', async () => {
      // use invalid process to cause a dispatch error
      const invalidProcess = { id: 'invalid', version: 1 }
      const extrinsic = await node.prepareRunProcess({ process: invalidProcess, inputs: [], outputs: [] })
      const [transaction] = await db.insertTransaction({
        api_type: 'demand_b',
        transaction_type: 'creation',
        local_id: seededDemandBId,
        state: 'submitted',
        hash: extrinsic.hash.toHex(),
      })

      node.submitRunProcess(extrinsic, db.updateTransactionState(transaction.id))

      // wait for dispatch error
      const failedTransaction = await pollTransactionState(db, transaction.id, 'failed')
      expect(failedTransaction.state).to.equal('failed')
    })
  })

  describe('demandB', () => {
    it('should create a demandB on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const response = await post(app, `/v1/demandB/${seededDemandBId}/creation`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      // wait for block to finalise
      await pollTransactionState(db, transactionId, 'finalised')

      // check local demandB updates with token id
      const [demandB] = await db.getDemand(seededDemandBId)
      expect(demandB.latestTokenId).to.equal(lastTokenId + 1)
      expect(demandB.originalTokenId).to.equal(lastTokenId + 1)
    })
  })

  describe('demandA', () => {
    it('creates an demandA on chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      const {
        body: { id: demandAId },
      } = await post(app, '/v1/demandA', { parametersAttachmentId })

      // submit to chain
      const response = await post(app, `/v1/demandA/${demandAId}/creation`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      await pollTransactionState(db, transactionId, 'finalised')

      const [demandA] = await db.getDemand(demandAId)
      expect(demandA).to.contain({
        id: demandAId,
        state: 'created',
        subtype: 'demand_a',
        parametersAttachmentId,
        latestTokenId: lastTokenId + 1,
        originalTokenId: lastTokenId + 1,
      })
    })
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
      } = await post(app, '/v1/demandA', { parametersAttachmentId })
      const {
        body: { id: demandATransactionId },
      } = await post(app, `/v1/demandA/${demandAId}/creation`, {})

      const {
        body: { id: demandBId },
      } = await post(app, '/v1/demandB', { parametersAttachmentId })
      const {
        body: { id: demandBTransactionId },
      } = await post(app, `/v1/demandB/${demandBId}/creation`, {})

      await pollTransactionState(db, demandATransactionId, 'finalised')
      const [demandA] = await db.getDemand(demandAId)
      demandALocalId = demandAId
      demandAOriginalId = demandA.originalTokenId

      await pollTransactionState(db, demandBTransactionId, 'finalised')
      const [demandB] = await db.getDemand(demandBId)
      demandBLocalId = demandBId
      demandBOriginalId = demandB.originalTokenId

      const {
        body: { id: match2Id },
      } = await post(app, '/v1/match2', { demandA: demandAId, demandB: demandBId })
      match2LocalId = match2Id
    })

    it('should propose a match2 on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const response = await post(app, `/v1/match2/${match2LocalId}/proposal`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      // wait for block to finalise
      await pollTransactionState(db, transactionId, 'finalised')

      // check local entities update with token id
      const [demandA] = await db.getDemand(demandALocalId)
      expect(demandA.latestTokenId).to.equal(lastTokenId + 1)
      expect(demandA.originalTokenId).to.equal(demandAOriginalId)

      const [demandB] = await db.getDemand(demandBLocalId)
      expect(demandB.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandB.originalTokenId).to.equal(demandBOriginalId)

      const [match2] = await db.getMatch2(match2LocalId)
      expect(match2.latestTokenId).to.equal(lastTokenId + 3)
      expect(match2.originalTokenId).to.equal(lastTokenId + 3)
    })

    it('should acceptA then acceptFinal a match2 on-chain', async () => {
      // propose
      const proposal = await post(app, `/v1/match2/${match2LocalId}/proposal`, {})

      // wait for block to finalise
      await pollTransactionState(db, proposal.body.id, 'finalised')

      const [match2] = await db.getMatch2(match2LocalId)
      const match2OriginalId = match2.originalTokenId
      const lastTokenId = await node.getLastTokenId()

      // submit accept to chain
      const responseAcceptA = await post(app, `/v1/match2/${match2LocalId}/accept`, {})
      expect(responseAcceptA.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptA.body.id, 'finalised')

      // check local entities update with token id
      const [match2AcceptA] = await db.getMatch2(match2LocalId)
      expect(match2AcceptA.latestTokenId).to.equal(lastTokenId + 1)
      expect(match2AcceptA.state).to.equal('acceptedA')
      expect(match2AcceptA.originalTokenId).to.equal(match2OriginalId)

      // submit 2nd accept to chain
      const responseAcceptFinal = await post(app, `/v1/match2/${match2LocalId}/accept`, {})
      expect(responseAcceptFinal.status).to.equal(201)

      // wait for block to finalise
      await pollTransactionState(db, responseAcceptFinal.body.id, 'finalised')

      // check local entities update with token id
      const [demandA] = await db.getDemand(demandALocalId)
      expect(demandA.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandA.state).to.equal('allocated')
      expect(demandA.originalTokenId).to.equal(demandAOriginalId)

      const [demandB] = await db.getDemand(demandBLocalId)
      expect(demandB.latestTokenId).to.equal(lastTokenId + 3)
      expect(demandB.state).to.equal('allocated')
      expect(demandB.originalTokenId).to.equal(demandBOriginalId)

      const [matchAcceptFinal] = await db.getMatch2(match2LocalId)
      expect(matchAcceptFinal.latestTokenId).to.equal(lastTokenId + 4)
      expect(matchAcceptFinal.state).to.equal('acceptedFinal')
      expect(matchAcceptFinal.originalTokenId).to.equal(match2OriginalId)
    })
  })
})
