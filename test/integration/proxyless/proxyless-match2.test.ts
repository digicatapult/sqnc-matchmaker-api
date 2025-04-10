import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { post } from '../../helper/routeHelper.js'
import { cleanup } from '../../seeds/onchainSeeds/onchain.match2.seed.js'
import {
  MockDispatcherContext,
  parametersAttachmentId,
  selfAddress,
  withAttachmentMock,
  withDispatcherMock,
  withIdentitySelfMock,
} from '../../helper/mock.js'
import Database from '../../../src/lib/db/index.js'
import ChainNode from '../../../src/lib/chainNode.js'
import { pollDemandState, pollMatch2State, pollTransactionState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { UUID } from '../../../src/models/strings.js'
import { container } from 'tsyringe'
import env from '../../../src/env.js'
import { registerContainerInstances } from '../../helper/registerContainerInstances.js'

describe('on-chain proxyless', function () {
  this.timeout(180000)
  registerContainerInstances()
  const db = container.resolve(Database)
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }
  const mock: MockDispatcherContext = {} as MockDispatcherContext

  withAppAndIndexer(context)
  withDispatcherMock(mock)
  withIdentitySelfMock(mock)
  withAttachmentMock(mock)

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
      const [maybeDemandA] = await db.get('demand', { id: ids.demandA })
      const demandA = maybeDemandA
      expect(demandA.latest_token_id).to.equal(lastTokenId + 1)
      expect(demandA.original_token_id).to.equal(ids.originalDemandA)

      const [maybeDemandB] = await db.get('demand', { id: ids.demandB })
      const demandB = maybeDemandB
      expect(demandB.latest_token_id).to.equal(lastTokenId + 2)
      expect(demandB.original_token_id).to.equal(ids.originalDemandB)

      const [maybeMatch2] = await db.get('match2', { id: ids.match2 })
      const match2 = maybeMatch2
      expect(match2.latest_token_id).to.equal(lastTokenId + 3)
      expect(match2.original_token_id).to.equal(lastTokenId + 3)
      expect(match2).to.contain({
        id: ids.match2,
        optimiser: selfAddress,
        member_a: selfAddress,
        member_b: selfAddress,
        state: 'proposed',
        replaces_id: null,
        latest_token_id: lastTokenId + 3,
        original_token_id: lastTokenId + 3,
      })
    })
  })
})
