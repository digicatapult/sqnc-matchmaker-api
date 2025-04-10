import { describe, it } from 'mocha'
import { expect } from 'chai'
import { SinonStub } from 'sinon'

import EventHandler from '../handleEvent.js'
import { withTransactionMatchingTokensInDb } from './fixtures/db.js'
import { withMockLogger } from './fixtures/logger.js'
import { withGetTokenResponses } from './fixtures/chainNode.js'
import { withMockEventProcessors } from './fixtures/eventProcessor.js'
import { invalidProcess, noInputsOutputs, complexEvent } from './fixtures/event.js'
import { ChangeSet } from '../changeSet.js'

describe('EventHandler', function () {
  it('should throw an exception if the process name is invalid', async function () {
    const db = withTransactionMatchingTokensInDb(null, new Map())
    const logger = withMockLogger()
    const node = withGetTokenResponses('0x01', new Set())
    const eventProcessors = withMockEventProcessors()
    const eventHandler = new EventHandler({ db, logger, node, eventProcessors })

    let thrown: Error | null = null
    try {
      await eventHandler.handleEvent(invalidProcess, {})
    } catch (err) {
      thrown = err instanceof Error ? err : null
    }
    expect(thrown).instanceOf(Error)
  })

  it('should fetch the transaction from the db and pass to the correct eventProcessor', async function () {
    const tx = { x: Symbol('tx') }
    const db = withTransactionMatchingTokensInDb(tx, new Map())
    const logger = withMockLogger()
    const node = withGetTokenResponses('0x01', new Set())
    const eventProcessors = withMockEventProcessors()
    const eventHandler = new EventHandler({ db, logger, node, eventProcessors })

    const result = await eventHandler.handleEvent(noInputsOutputs, {})
    expect(result).to.deep.equal({})

    const stub = eventProcessors['demand_create'] as SinonStub
    expect(stub.calledOnce).to.equal(true)
    expect(stub.firstCall.args).to.deep.equal([1, tx, 'alice', [], []])
  })

  it('should map inputs to localId using the db', async function () {
    const db = withTransactionMatchingTokensInDb(
      null,
      new Map([
        [1, '1'],
        [2, '2'],
        [3, '3'],
      ])
    )
    const logger = withMockLogger()
    const node = withGetTokenResponses('0x01', new Set([4, 5, 6]))
    const eventProcessors = withMockEventProcessors()
    const eventHandler = new EventHandler({ db, logger, node, eventProcessors })

    const result = await eventHandler.handleEvent(complexEvent, {})
    expect(result).to.deep.equal({})

    const stub = eventProcessors['demand_create'] as SinonStub
    expect(stub.calledOnce).to.equal(true)
    expect(stub.firstCall.args).to.deep.equal([
      1,
      null,
      'alice',
      [
        { id: 1, localId: '1' },
        { id: 2, localId: '2' },
        { id: 3, localId: '3' },
      ],
      [
        { id: 4, roles: new Map(), metadata: new Map() },
        { id: 5, roles: new Map(), metadata: new Map() },
        { id: 6, roles: new Map(), metadata: new Map() },
      ],
    ])
  })

  it('should prefer ChangeSet to db', async function () {
    const db = withTransactionMatchingTokensInDb(
      null,
      new Map([
        [1, '1'],
        [2, '2'],
        [3, '3'],
      ])
    )
    const logger = withMockLogger()
    const node = withGetTokenResponses('0x01', new Set([4, 5, 6]))
    const eventProcessors = withMockEventProcessors()
    const eventHandler = new EventHandler({ db, logger, node, eventProcessors })

    const baseChangeSet: ChangeSet = {
      demands: new Map([
        ['7', { type: 'update', id: '7', latest_token_id: 1, state: 'created' }],
        ['8', { type: 'update', id: '8', latest_token_id: 2, state: 'created' }],
        ['9', { type: 'update', id: '9', latest_token_id: 3, state: 'created' }],
      ]),
    }

    const result = await eventHandler.handleEvent(complexEvent, baseChangeSet)
    expect(result).to.deep.equal(baseChangeSet)

    const stub = eventProcessors['demand_create'] as SinonStub
    expect(stub.calledOnce).to.equal(true)
    expect(stub.firstCall.args).to.deep.equal([
      1,
      null,
      'alice',
      [
        { id: 1, localId: '7' },
        { id: 2, localId: '8' },
        { id: 3, localId: '9' },
      ],
      [
        { id: 4, roles: new Map(), metadata: new Map() },
        { id: 5, roles: new Map(), metadata: new Map() },
        { id: 6, roles: new Map(), metadata: new Map() },
      ],
    ])
  })

  it('should return a merged ChangeSet', async function () {
    const resultChangeSet: ChangeSet = {
      attachments: new Map([
        [
          '10',
          {
            type: 'insert',
            id: '10',
            integrityHash: '42',
            ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          },
        ],
      ]),
    }
    const db = withTransactionMatchingTokensInDb(null, new Map())
    const logger = withMockLogger()
    const node = withGetTokenResponses('0x01', new Set([4, 5, 6]))
    const eventProcessors = withMockEventProcessors(resultChangeSet)
    const eventHandler = new EventHandler({ db, logger, node, eventProcessors })

    const baseChangeSet: ChangeSet = {
      demands: new Map([
        ['7', { type: 'update', id: '7', latest_token_id: 1, state: 'created' }],
        ['8', { type: 'update', id: '8', latest_token_id: 2, state: 'created' }],
        ['9', { type: 'update', id: '9', latest_token_id: 3, state: 'created' }],
      ]),
    }

    const result = await eventHandler.handleEvent(complexEvent, baseChangeSet)
    expect(result).to.deep.equal({
      ...resultChangeSet,
      ...baseChangeSet,
    })
  })
})
