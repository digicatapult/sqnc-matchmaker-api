import { describe, it } from 'mocha'
import { expect } from 'chai'
import { SinonStub } from 'sinon'
import sinon from 'sinon'

import BlockHandler from '../handleBlock'

import { withMockLogger } from './fixtures/logger'
import { events2, withProcessRanEvents } from './fixtures/chainNode'
import { changeSets2 } from './fixtures/changeSet'

describe('BlockHandler', function () {
  describe('handleBlock', function () {
    it('should fetch events from node for blockHash', async function () {
      const logger = withMockLogger()
      const node = withProcessRanEvents([])
      const blockHandler = new BlockHandler({ logger, node })
      await blockHandler.handleBlock('123')
      const stub = node.getProcessRanEvents as SinonStub
      expect(stub.calledOnce).to.equal(true)
      expect(stub.firstCall.args[0]).to.equal('123')
    })

    it('should recursively process events', async function () {
      const events = events2
      const changeSets = changeSets2

      const logger = withMockLogger()
      const node = withProcessRanEvents(events)
      const blockHandler = new BlockHandler({ logger, node })
      const stub = sinon
        .stub<any, 'handleEvent'>(blockHandler, 'handleEvent')
        .onFirstCall()
        .resolves(changeSets[0])
        .onSecondCall()
        .resolves(changeSets[1])

      const result = await blockHandler.handleBlock('123')
      expect(stub.calledTwice).to.equal(true)
      expect(stub.firstCall.args).to.deep.equal([events[0], {}])
      expect(stub.secondCall.args).to.deep.equal([events[1], changeSets[0]])
      expect(result).to.deep.equal(changeSets[1])
    })
  })
})
