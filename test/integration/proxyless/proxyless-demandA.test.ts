import { describe, beforeEach, afterEach, it } from 'mocha'
import type { Express } from 'express'
import { expect } from 'chai'

import type Indexer from '../../../src/lib/indexer/index.js'
import { post } from '../../helper/routeHelper.js'
import { seed, cleanup } from '../../seeds/onchainSeeds/demandA.seed.js'

import type { MockDispatcherContext } from '../../helper/mock.js'
import {
  parametersAttachmentId,
  selfAddress,
  withAttachmentMock,
  withDispatcherMock,
  withIdentitySelfMock,
} from '../../helper/mock.js'
import Database from '../../../src/lib/db/index.js'
import ChainNode from '../../../src/lib/chainNode.js'
import { pollTransactionState, pollDemandState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { container } from 'tsyringe'
import env from '../../../src/env.js'
import { registerContainerInstances } from '../../helper/registerContainerInstances.js'

describe('on-chain proxyless', function () {
  this.timeout(80000)
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

  describe('demandA', () => {
    it('ensure we are not using proxy', () => {
      expect(env.PROXY_FOR).to.equal('')
    })
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

      await node.clearAllTransactions()
      await pollTransactionState(db, transactionId, 'finalised')
      await pollDemandState(db, demandAId, 'created')

      const [demandA] = await db.get('demand', { id: demandAId })
      expect(demandA).to.contain({
        id: demandAId,
        owner: selfAddress,
        state: 'created',
        subtype: 'demand_a',
        parameters_attachment_id: parametersAttachmentId,
        latest_token_id: lastTokenId + 1,
        original_token_id: lastTokenId + 1,
      })
    })
  })
})
