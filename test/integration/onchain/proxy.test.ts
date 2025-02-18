import { describe } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { withIdentitySelfMock } from '../../helper/mock.js'
import Database from '../../../src/lib/db/index.js'
import ChainNode from '../../../src/lib/chainNode.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { container } from 'tsyringe'
import { setupProxy } from '../../helper/proxy.js'
import { cleanup, parametersAttachmentId } from '../../seeds/onchainSeeds/demandA.seed.js'
import { post } from '../../helper/routeHelper.js'
import { pollTransactionState, pollDemandState } from '../../helper/poll.js'

describe('on-chain proxy', function () {
  this.timeout(60000)

  const db = new Database()
  const node = container.resolve(ChainNode)
  const context: { app: Express; indexer: Indexer } = {} as { app: Express; indexer: Indexer }

  withAppAndIndexer(context)

  withIdentitySelfMock()

  beforeEach(async function () {
    await cleanup()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('proxy', async () => {
    it('should set up a transaction as a proxy', async () => {
      await setupProxy(node)
      //   const lastTokenId = await node.getLastTokenId()
      //   const {
      //     body: { id: demandAId },
      //   } = await post(context.app, '/v1/demandA', { parametersAttachmentId })
      //   const [demandAi] = await db.getDemand(demandAId)
      //   console.log(demandAi)

      //   console.log(demandAId)
      //   // submit to chain
      //   const response = await post(context.app, `/v1/demandA/${demandAId}/creation`, {})
      //   expect(response.status).to.equal(201)

      //   const { id: transactionId, state } = response.body
      //   expect(transactionId).to.match(
      //     /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      //   )
      //   expect(state).to.equal('submitted')

      //   await node.clearAllTransactions()
      //   await pollTransactionState(db, transactionId, 'finalised')
      //   await pollDemandState(db, demandAId, 'created')

      //   const [demandA] = await db.getDemand(demandAId)
      //   expect(demandA).to.contain({
      //     id: demandAId,
      //     state: 'created',
      //     subtype: 'demand_a',
      //     parametersAttachmentId,
      //     latestTokenId: lastTokenId + 1,
      //     originalTokenId: lastTokenId + 1,
      //   })
    })
  })
})
