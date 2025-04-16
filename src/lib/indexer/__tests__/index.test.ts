import 'reflect-metadata'
import { describe, it, afterEach, beforeEach } from 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'

import { withMockLogger } from './fixtures/logger.js'
import {
  withLastProcessedBlocksByCall,
  withInitialLastProcessedBlock,
  withMockAttachment,
  withInitialLastProcessedBlockAndTxError,
} from './fixtures/db.js'
import { withHappyChainNode, withGetHeaderBoom } from './fixtures/chainNode.js'
import Indexer, { getStatus } from '../index.js'
import { container } from 'tsyringe'
import DefaultBlockHandler from '../../../lib/indexer/handleBlock.js'
import { registerInstances } from './fixtures/registerInstances.js'

describe('Indexer', function () {
  let indexer: Indexer
  const logger = withMockLogger()

  beforeEach(async function () {
    container.clearInstances()
  })

  describe('start', function () {
    afterEach(async function () {
      await indexer.close()
    })

    it('should return null if the db has no processed blocks', async function () {
      const db = withInitialLastProcessedBlock(null)
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)

      // const handleBlock = sinon.stub().resolves({})
      indexer.setHandleBlock(new DefaultBlockHandler({ db, node, logger }))
      const result = await indexer.start()
      expect(result).to.equal(null)
    })

    it('should return hash if the db has processed blocks', async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)

      // const handleBlock = sinon.stub().resolves({})
      indexer.setHandleBlock(new DefaultBlockHandler({ db, node, logger }))

      const result = await indexer.start()
      expect(result).to.equal('1-hash')
    })

    it('should handle new blocks immediately', async function () {
      const db = withInitialLastProcessedBlock(null)
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)

      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)
      await indexer.start()
      expect(handleBlockStub.notCalled).to.be.equal(true)
    })
  })

  describe('processNextBlock', function () {
    beforeEach(async function () {
      container.clearInstances()
    })
    it('should do nothing and return null if there are no blocks to process', async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)

      await indexer.start()
      const result = await indexer.processNextBlock('1-hash')

      expect(result).to.equal(null)
      expect(handleBlockStub.notCalled).to.be.equal(true)
    })

    it("should process next block and return it's hash if there's one block to process", async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)
      await indexer.start()
      const result = await indexer.processNextBlock('2-hash')

      expect(result).to.equal('2-hash')
      expect(handleBlockStub.calledOnce).to.be.equal(true)
      expect(handleBlockStub.getCall(0).args[0]).to.equal('2-hash')
    })

    it("should process next block and return it's hash if there's more than one block to process", async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)
      await indexer.start()
      const result = await indexer.processNextBlock('3-hash')

      expect(result).to.equal('2-hash')
      expect(handleBlockStub.calledOnce).to.be.equal(true)
      expect(handleBlockStub.getCall(0).args[0]).to.equal('2-hash')
    })

    it("should process successive blocks on each call if there's two block to process", async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)
      await indexer.start()
      await indexer.processNextBlock('3-hash')
      const result = await indexer.processNextBlock('3-hash')

      expect(result).to.equal('3-hash')
      expect(handleBlockStub.calledTwice).to.be.equal(true)
      expect(handleBlockStub.getCall(0).args[0]).to.equal('2-hash')
      expect(handleBlockStub.getCall(1).args[0]).to.equal('3-hash')
    })

    it("should do nothing if we're up to date after processing blocks", async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)
      await indexer.start()
      await indexer.processNextBlock('2-hash')
      const result = await indexer.processNextBlock('2-hash')

      expect(result).to.equal(null)
      expect(handleBlockStub.calledOnce).to.be.equal(true)
      expect(handleBlockStub.getCall(0).args[0]).to.equal('2-hash')
    })

    it('should skip over blocks if another instance processes them', async function () {
      const db = withLastProcessedBlocksByCall([
        { hash: '1-hash', parent: '0-hash', height: BigInt(1) },
        { hash: '1-hash', parent: '0-hash', height: BigInt(1) },
        { hash: '4-hash', parent: '1-hash', height: BigInt(4) },
      ])
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)
      await indexer.start()
      await indexer.processNextBlock('5-hash')
      const result = await indexer.processNextBlock('5-hash')

      expect(result).to.equal('5-hash')
      expect(handleBlockStub.calledTwice).to.be.equal(true)
      expect(handleBlockStub.getCall(0).args[0]).to.equal('5-hash')
      expect(handleBlockStub.getCall(1).args[0]).to.equal('5-hash')
    })

    it('should continue to process blocks if last finalised block goes backwards', async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(0) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)
      await indexer.start()
      await indexer.processNextBlock('3-hash')
      const result = await indexer.processNextBlock('2-hash')

      expect(result).to.equal('2-hash')
      expect(handleBlockStub.calledTwice).to.be.equal(true)
      expect(handleBlockStub.getCall(0).args[0]).to.equal('1-hash')
      expect(handleBlockStub.getCall(1).args[0]).to.equal('2-hash')
    })

    it('should upsert demands and match2 entries from changeset', async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({
        demands: new Map([
          ['123', { type: 'update', id: '42' }],
          ['456', { type: 'update', id: '43' }],
        ]),
        matches: new Map([
          ['789', { type: 'update', id: '44' }],
          ['101', { type: 'update', id: '45' }],
        ]),
        attachments: new Map([
          ['111', { type: 'insert', id: '46', integrityHash: 'hash1', ownerAddress: 'alice' }],
          ['121', { type: 'insert', id: '47', integrityHash: 'hash2', ownerAddress: 'bob' }],
        ]),
      })
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)

      await indexer.start()
      await indexer.processNextBlock('2-hash')

      expect((db.updateDemand as sinon.SinonStub).calledTwice).to.equal(true)
      expect((db.updateDemand as sinon.SinonStub).firstCall.args).to.deep.equal(['42', { id: '42' }])
      expect((db.updateDemand as sinon.SinonStub).secondCall.args).to.deep.equal(['43', { id: '43' }])

      expect((db.updateMatch2 as sinon.SinonStub).calledTwice).to.equal(true)
      expect((db.updateMatch2 as sinon.SinonStub).firstCall.args).to.deep.equal(['44', { id: '44' }])
      expect((db.updateMatch2 as sinon.SinonStub).secondCall.args).to.deep.equal(['45', { id: '45' }])

      expect((attachment.insertAttachment as sinon.SinonStub).calledTwice).to.equal(true)
      expect((attachment.insertAttachment as sinon.SinonStub).firstCall.args).to.deep.equal(['hash1', 'alice'])
      expect((attachment.insertAttachment as sinon.SinonStub).secondCall.args).to.deep.equal(['hash2', 'bob'])
    })

    it('should insert demands and match2 entries from changeset', async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({
        demands: new Map([
          ['123', { type: 'insert', id: '42', parameters_attachment_id: '46' }],
          ['456', { type: 'insert', id: '43', parameters_attachment_id: '47' }],
        ]),
        matches: new Map([
          ['789', { type: 'insert', id: '44' }],
          ['101', { type: 'insert', id: '45' }],
        ]),
        attachments: new Map([
          ['111', { type: 'insert', id: '46', integrityHash: 'hash1', ownerAddress: 'alice' }],
          ['121', { type: 'insert', id: '47', integrityHash: 'hash2', ownerAddress: 'bob' }],
        ]),
      })
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)

      await indexer.start()
      await indexer.processNextBlock('2-hash')

      expect((db.insertDemand as sinon.SinonStub).calledTwice).to.equal(true)
      expect((db.insertDemand as sinon.SinonStub).firstCall.args[0]).to.deep.equal({
        id: '42',
        parameters_attachment_id: 'hash1-alice',
      })
      expect((db.insertDemand as sinon.SinonStub).secondCall.args[0]).to.deep.equal({
        id: '43',
        parameters_attachment_id: 'hash2-bob',
      })

      expect((db.insertMatch2 as sinon.SinonStub).calledTwice).to.equal(true)
      expect((db.insertMatch2 as sinon.SinonStub).firstCall.args[0]).to.deep.equal({ id: '44' })
      expect((db.insertMatch2 as sinon.SinonStub).secondCall.args[0]).to.deep.equal({ id: '45' })

      expect((attachment.insertAttachment as sinon.SinonStub).calledTwice).to.equal(true)
      expect((attachment.insertAttachment as sinon.SinonStub).firstCall.args).to.deep.equal(['hash1', 'alice'])
      expect((attachment.insertAttachment as sinon.SinonStub).secondCall.args).to.deep.equal(['hash2', 'bob'])
    })

    it('should delete attachments on db error', async function () {
      const db = withInitialLastProcessedBlockAndTxError({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({
        demands: new Map([
          ['123', { type: 'insert', id: '42', parameters_attachment_id: '46' }],
          ['456', { type: 'insert', id: '43', parameters_attachment_id: '47' }],
        ]),
        matches: new Map([
          ['789', { type: 'insert', id: '44' }],
          ['101', { type: 'insert', id: '45' }],
        ]),
        attachments: new Map([
          ['111', { type: 'insert', id: '46', integrityHash: 'hash1', ownerAddress: 'alice' }],
          ['121', { type: 'insert', id: '47', integrityHash: 'hash2', ownerAddress: 'bob' }],
        ]),
      })
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)

      await indexer.start()
      await indexer.processNextBlock('2-hash')

      expect((attachment.insertAttachment as sinon.SinonStub).callCount).to.equal(4)
      expect((db.insertMatch2 as sinon.SinonStub).calledTwice).to.equal(true)

      const deleteStub = attachment.deleteAttachment as sinon.SinonStub
      expect(deleteStub.calledTwice).to.equal(true)
      expect(deleteStub.firstCall.args).to.deep.equal(['hash1-alice'])
      expect(deleteStub.secondCall.args).to.deep.equal(['hash2-bob'])
    })

    describe('exception cases', function () {
      let clock: sinon.SinonFakeTimers
      beforeEach(function () {
        clock = sinon.useFakeTimers()
      })

      afterEach(function () {
        clock.restore()
      })

      it('should retry after configured delay', async function () {
        const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
        const node = withGetHeaderBoom(1)
        const attachment = withMockAttachment()
        indexer = registerInstances(node, db, attachment)
        const handleBlockStub = sinon.stub().resolves({})
        const blockHandlerMock = {
          handleBlock: handleBlockStub,
        } as unknown as DefaultBlockHandler
        indexer.setHandleBlock(blockHandlerMock)

        await indexer.start()
        const p = indexer.processNextBlock('2-hash').then((s) => s)
        clock.tickAsync(1000)

        const result = await p

        expect(result).to.equal('2-hash')
        expect(handleBlockStub.calledTwice).to.be.equal(true)
        expect(handleBlockStub.getCall(0).args[0]).to.equal('2-hash')
        expect(handleBlockStub.getCall(1).args[0]).to.equal('2-hash')
      })

      it('should retry if handler goes boom', async function () {
        const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
        const node = withHappyChainNode()
        const attachment = withMockAttachment()
        indexer = registerInstances(node, db, attachment)
        const handleBlockStub = sinon.stub().resolves({}).onCall(0).rejects(new Error('BOOM'))

        const blockHandlerMock = {
          handleBlock: handleBlockStub,
        } as unknown as DefaultBlockHandler
        indexer.setHandleBlock(blockHandlerMock)
        await indexer.start()
        const p = indexer.processNextBlock('2-hash').then((s) => s)
        clock.tickAsync(1000)

        const result = await p

        expect(result).to.equal('2-hash')
        expect(handleBlockStub.calledTwice).to.be.equal(true)
        expect(handleBlockStub.getCall(1).args[0]).to.equal('2-hash')
      })
    })
  })

  describe('processAllBlocks', function () {
    it('should process all pending blocks', async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)

      await indexer.start()
      const result = await indexer.processAllBlocks('3-hash')

      expect(result).to.equal('3-hash')
      expect(handleBlockStub.calledTwice).to.be.equal(true)
      expect(handleBlockStub.getCall(0).args[0]).to.equal('2-hash')
      expect(handleBlockStub.getCall(1).args[0]).to.equal('3-hash')
    })

    it('should return null if no blocks to process', async function () {
      const db = withInitialLastProcessedBlock({ hash: '1-hash', parent: '0-hash', height: BigInt(1) })
      const node = withHappyChainNode()
      const attachment = withMockAttachment()
      indexer = registerInstances(node, db, attachment)
      const handleBlockStub = sinon.stub().resolves({})
      const blockHandlerMock = {
        handleBlock: handleBlockStub,
      } as unknown as DefaultBlockHandler
      indexer.setHandleBlock(blockHandlerMock)

      await indexer.start()
      const result = await indexer.processAllBlocks('1-hash')

      expect(result).to.equal(null)
      expect(handleBlockStub.notCalled).to.be.equal(true)
    })
  })
  describe('getStatus tests', function () {
    let clock: sinon.SinonFakeTimers
    beforeEach(function () {
      clock = sinon.useFakeTimers()
    })

    afterEach(function () {
      clock.restore()
    })
    it('should return service UP if within 30s of starting up', async function () {
      const startupTime = new Date('2024-11-25T00:00:00.000Z')
      clock.setSystemTime(new Date('2024-11-25T00:00:25.000Z'))
      const result = await getStatus(30000, startupTime, null, null)
      expect(result).to.have.property('status', 'ok')
      expect(result.detail).to.have.property('message', 'Service healthy. Starting up.')
    })
    it('should return service DOWN if it has started up a while back', async function () {
      const startupTime = new Date('2024-11-25T00:00:15.000Z')
      clock.setSystemTime(new Date('2024-11-25T00:01:00.000Z'))
      const result = await getStatus(30000, startupTime, null, null)
      expect(result).to.have.property('status', 'down')
      expect(result.detail).to.have.property(
        'message',
        'Last activity was more than 30s ago, no blocks were processed.'
      )
      expect(result.detail).to.have.property('latestActivityTime', null)
    })
    it('should return service UP because we are "catching up" on old blocks', async function () {
      const currentTime = new Date('2024-11-25T00:01:00.000Z')
      clock.setSystemTime(currentTime)
      const startupTime = new Date(currentTime.getTime() - 30 * 1000)
      // lastUnprocessedBlockTime: 2 seconds after current time
      const lastUnprocessedBlockTime = new Date(currentTime.getTime() + 2 * 1000)
      const result = await getStatus(30000, startupTime, null, lastUnprocessedBlockTime)
      expect(result).to.have.property('status', 'ok')
      const latestActivityTime = result.detail?.latestActivityTime
      expect(latestActivityTime).to.be.instanceOf(Date)
      expect(result.detail).to.have.property('message', 'Service healthy. Running.')
    })
    it('should return service UP because we are processing blocks', async function () {
      const currentTime = new Date('2024-11-25T00:01:00.000Z')
      clock.setSystemTime(currentTime)
      const startupTime = new Date(currentTime.getTime() - 30 * 1000)
      // lastProcessedBlockTime: 4 seconds after current time
      const lastUnprocessedBlockTime = new Date(currentTime.getTime() + 2 * 1000)
      const lastProcessedBlockTime = new Date(currentTime.getTime() + 4 * 1000)
      const result = await getStatus(30000, startupTime, lastProcessedBlockTime, lastUnprocessedBlockTime)
      expect(result).to.have.property('status', 'ok')
      const latestActivityTime = result.detail?.latestActivityTime
      expect(latestActivityTime).to.be.instanceOf(Date)
      expect(result.detail).to.have.property('message', 'Service healthy. Running.')
    })
    it('should return service DOWN if last activity was more than 30s ago (catching up to blocks)', async function () {
      const currentTime = new Date('2024-11-25T00:05:00.000Z')
      clock.setSystemTime(currentTime)
      // Startup time: 2 minutes before current time
      const startupTime = new Date(currentTime.getTime() - 2 * 60 * 1000)
      // lastProcessedBlockTime: 35 seconds before current time
      const lastUnprocessedBlockTime = new Date(currentTime.getTime() - 35 * 1000)
      const result = await getStatus(30000, startupTime, null, lastUnprocessedBlockTime)
      expect(result).to.have.property('status', 'down')
      const latestActivityTime = result.detail?.latestActivityTime
      expect(latestActivityTime).to.be.instanceOf(Date)
      expect(result.detail?.message).to.include(
        'Last activity was more than 30s ago. Last learned of block: Mon Nov 25 2024 00:04:25'
      )
    })
    it('should return service DOWN if last activity was more than 30s ago (catching up to blocks)', async function () {
      const currentTime = new Date('2024-11-25T00:05:00.000Z')
      clock.setSystemTime(currentTime)
      // Startup time: 2 minutes before current time
      const startupTime = new Date(currentTime.getTime() - 2 * 60 * 1000)
      // lastProcessedBlockTime: 35 seconds before current time
      const lastUnprocessedBlockTime = new Date(currentTime.getTime() - 35 * 1000)
      const lastProcessedBlockTime = new Date(currentTime.getTime() - 35 * 1000)
      const result = await getStatus(30000, startupTime, lastProcessedBlockTime, lastUnprocessedBlockTime)
      expect(result).to.have.property('status', 'down')
      const latestActivityTime = result.detail?.latestActivityTime
      expect(latestActivityTime).to.be.instanceOf(Date)
      expect(result.detail?.message).to.include(
        'Last activity was more than 30s ago. Last processed block at : Mon Nov 25 2024 00:04:25 GMT+0000'
      )
    })
  })
})
