import { describe, beforeEach, afterEach, it } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { post } from '../../helper/routeHelper.js'
import { cleanup, seed, seededDemandBId } from '../../seeds/onchainSeeds/demandB.seed.js'
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
import { pollDemandState, pollTransactionState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { container } from 'tsyringe'
import env from '../../../src/env.js'
import { registerContainerInstances } from '../../helper/registerContainerInstances.js'

describe('on-chain proxyless', function () {
  this.timeout(60000)
  registerContainerInstances()
  const db = container.resolve(Database)
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }
  const mock: MockDispatcherContext = {} as MockDispatcherContext

  withAppAndIndexer(context)
  withDispatcherMock(mock)
  withIdentitySelfMock(mock)
  withAttachmentMock(mock)

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('demandB', () => {
    it('ensure we are not using proxy', () => {
      expect(env.PROXY_FOR).to.equal('')
    })
    it('should create a demandB on-chain', async () => {
      const lastTokenId = await node.getLastTokenId()

      // submit to chain
      const response = await post(context.app, `/v1/demandB/${seededDemandBId}/creation`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      // wait for block to finalise
      await node.sealBlock()
      await pollTransactionState(db, transactionId, 'finalised')
      await pollDemandState(db, seededDemandBId, 'created')

      // check local demandB updates with token id
      const [maybeDemandB] = await db.get('demand', { id: seededDemandBId })
      const demandB = maybeDemandB
      expect(demandB).to.contain({
        id: seededDemandBId,
        owner: selfAddress,
        state: 'created',
        subtype: 'demand_b',
        parameters_attachment_id: parametersAttachmentId,
        latest_token_id: lastTokenId + 1,
        original_token_id: lastTokenId + 1,
      })
    })
  })
})
