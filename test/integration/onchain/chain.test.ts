import { describe } from 'mocha'
import type { Express } from 'express'
import { expect } from 'chai'

import type Indexer from '../../../src/lib/indexer/index.js'
import { cleanup, seededDemandBId } from '../../seeds/onchainSeeds/transaction.seed.js'
import type { MockDispatcherContext } from '../../helper/mock.js'
import { withAttachmentMock, withDispatcherMock, withIdentitySelfMock } from '../../helper/mock.js'
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
  const mockContext: MockDispatcherContext = {} as MockDispatcherContext

  withAppAndIndexer(context)

  withDispatcherMock(mockContext)
  withIdentitySelfMock(mockContext)
  withAttachmentMock(mockContext)

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
      const [transaction] = await db.insert('transaction', {
        api_type: 'demand_b',
        transaction_type: 'creation',
        local_id: seededDemandBId,
        state: 'submitted',
        hash: extrinsic.hash.toHex().slice(2),
      })

      node.submitRunProcess(extrinsic, async (state) => {
        await db.update('transaction', { id: transaction.id }, { state })
      })

      // wait for dispatch error
      await node.sealBlock()
      await pollTransactionState(db, transaction.id, 'failed')
      const [failedTransaction] = await db.get('transaction', { id: transaction.id })
      expect(failedTransaction?.state).to.equal('failed')
    })
  })
})
