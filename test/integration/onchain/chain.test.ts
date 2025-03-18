import { describe } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import Indexer from '../../../src/lib/indexer/index.js'
import { cleanup, seededDemandBId } from '../../seeds/onchainSeeds/transaction.seed.js'
import { withIdentitySelfMock } from '../../helper/mock.js'
import ChainNode from '../../../src/lib/chainNode.js'
import { pollTransactionState } from '../../helper/poll.js'
import { withAppAndIndexer } from '../../helper/chainTest.js'
import { container } from 'tsyringe'
import Database from '../../../src/lib/db/index.js'
import { registerContainerInstances } from '../../helper/registerContainerInstances.js'

describe('on-chain', function () {
  this.timeout(60000)
  registerContainerInstances()
  const db = container.resolve(Database)
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
      await pollTransactionState(db, transaction.id, 'failed')
      const [failedTransaction] = await db.getTransaction(transaction.id)
      expect(failedTransaction?.state).to.equal('failed')
    })
  })
})
