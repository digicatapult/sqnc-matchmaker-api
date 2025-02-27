import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { post } from '../../helper/routeHelper.js'
import { seed, cleanup, parametersAttachmentId } from '../../seeds/onchainSeeds/onchain.match2.seed.js'
import { selfAddress, withIdentitySelfMock } from '../../helper/mock.js'
import Database, { DemandRow, Match2Row } from '../../../src/lib/db/index.js'
import ChainNode from '../../../src/lib/chainNode.js'
import { pollDemandState, pollMatch2State, pollTransactionState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { UUID } from '../../../src/models/strings.js'
import { container } from 'tsyringe'
import env from '../../../src/env.js'

describe('on-chain proxyless', function () {
  this.timeout(180000)
  const db = new Database()
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }

  withAppAndIndexer(context)
  withIdentitySelfMock()

  beforeEach(async () => await seed())
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

      const [demandA]: DemandRow[] = await db.getDemand(demandAId)

      await node.sealBlock()
      await pollTransactionState(db, demandBTransactionId, 'finalised')
      await pollDemandState(db, demandBId, 'created')

      const [demandB]: DemandRow[] = await db.getDemand(demandBId)

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
        originalDemandB: demandB.originalTokenId as number,
        originalDemandA: demandA.originalTokenId as number,
        demandA: demandAId,
        demandB: demandBId,
        match2: match2Id,
        newDemandB: newDemandBId,
      }
    })
    it('ensure we are not using proxy', () => {
      expect(env.PROXY_FOR).to.equal('')
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
      expect(match2).to.contain({
        id: ids.match2,
        optimiser: selfAddress,
        memberA: selfAddress,
        memberB: selfAddress,
        state: 'proposed',
        replaces: null,
        latestTokenId: lastTokenId + 3,
        originalTokenId: lastTokenId + 3,
      })
    })
  })
})
