import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer'
import { post } from '../../helper/routeHelper'
import { seed, cleanup, parametersAttachmentId, seededDemandAId } from '../../seeds/onchainSeeds/demandA.seed'

import { selfAddress, withIdentitySelfMock } from '../../helper/mock'
import Database, { DemandRow } from '../../../src/lib/db'
import ChainNode from '../../../src/lib/chainNode'
import { logger } from '../../../src/lib/logger'
import env from '../../../src/env'
import { pollTransactionState } from '../../helper/poll'
import { withAppAndIndexer } from '../../helper/chainTest'

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

  describe('demandA', () => {
    it('creates an demandA on chain', async () => {
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

    it('should comment on a demandA on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const creationResponse = await post(context.app, `/v1/demandA/${seededDemandAId}/creation`, {})
      expect(creationResponse.status).to.equal(201)
      // wait for block to finalise
      await pollTransactionState(db, creationResponse.body.id, 'finalised')

      // submit to chain
      const commentResponse = await post(context.app, `/v1/demandA/${seededDemandAId}/comment`, {
        attachmentId: parametersAttachmentId,
      })
      expect(commentResponse.status).to.equal(201)
      // wait for block to finalise
      await pollTransactionState(db, commentResponse.body.id, 'finalised')

      // check local demandA updates with token id
      const [maybeDemandB] = await db.getDemand(seededDemandAId)
      const demandA = maybeDemandB as DemandRow
      expect(demandA.latestTokenId).to.equal(lastTokenId + 2)
      expect(demandA.originalTokenId).to.equal(lastTokenId + 1)

      const [maybeComment] = await db.getDemandCommentForTransaction(commentResponse.body.id)
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
  })
})
