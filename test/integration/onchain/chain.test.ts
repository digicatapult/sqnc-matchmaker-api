import { describe } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer'
import { seed, cleanup, seededDemandBId } from '../../seeds'

import { withIdentitySelfMock } from '../../helper/mock'
import Database from '../../../src/lib/db'
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
})
