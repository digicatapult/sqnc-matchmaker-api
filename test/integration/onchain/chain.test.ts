import { describe } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { cleanup, seededDemandBId } from '../../seeds/onchainSeeds/transaction.seed.js'
import { withIdentitySelfMock } from '../../helper/mock.js'
import Database from '../../../src/lib/db/index.js'
import ChainNode from '../../../src/lib/chainNode.js'
import { logger } from '../../../src/lib/logger.js'
import env from '../../../src/env.js'
import { pollTransactionState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'

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
    await cleanup()
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
      await node.sealBlock()
      const failedTransaction = await pollTransactionState(db, transaction.id, 'failed')
      expect(failedTransaction.state).to.equal('failed')
    })
  })
})
