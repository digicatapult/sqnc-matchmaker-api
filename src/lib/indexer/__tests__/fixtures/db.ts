import sinon from 'sinon'

import Database from '../../../db/index.js'

type LastProcessBlockResult = { hash: string; parent: string; height: number } | null

export const withLastProcessedBlocksByCall = (calls: LastProcessBlockResult[]) => {
  let getMock = sinon.stub().resolves(calls.at(-1))
  for (let i = 0; i < calls.length; i++) {
    getMock = getMock.onCall(i).resolves(calls[i])
  }

  const insertProcessedBlock = sinon.stub().resolves()
  const getNextUnprocessedBlockAboveHeight = sinon
    .stub()
    .callsFake((height) => Promise.resolve({ hash: `${height}-hash` }))
  const tryInsertUnprocessedBlock = sinon.stub().resolves()
  const getNextUnprocessedBlockAtHeight = sinon
    .stub()
    .callsFake((height) => Promise.resolve({ hash: `${height}-hash` }))

  const self = {
    tryInsertUnprocessedBlock,
    getNextUnprocessedBlockAtHeight,
    getNextUnprocessedBlockAboveHeight,
    getLastProcessedBlock: sinon.stub().resolves(calls[2]),
    withTransaction: sinon.spy(async function (fn: (db: Database) => Promise<void>) {
      await fn({
        tryInsertUnprocessedBlock,
        getNextUnprocessedBlockAtHeight,
        getNextUnprocessedBlockAboveHeight,
        insertProcessedBlock,
      } as unknown as Database)
    }),
  } as unknown as Database

  return self
}

export const withInitialLastProcessedBlock = (initial: LastProcessBlockResult) => {
  let lastBlock: LastProcessBlockResult = initial
  const getMock = sinon.spy(() => Promise.resolve(lastBlock))

  const insertProcessedBlock = sinon.spy((block: LastProcessBlockResult) => {
    lastBlock = block
    return Promise.resolve()
  })
  const updateDemand = sinon.stub().resolves()
  const updateMatch2 = sinon.stub().resolves()
  const insertDemand = sinon.stub().resolves()
  const insertMatch2 = sinon.stub().resolves()
  const insertAttachment = sinon.stub().resolves()
  const getNextUnprocessedBlockAboveHeight = sinon.stub().callsFake((height) => ({ hash: `${height}-hash` }))
  const tryInsertUnprocessedBlock = sinon.stub().resolves()
  const getNextUnprocessedBlockAtHeight = sinon
    .stub()
    .callsFake((height) => Promise.resolve({ hash: `${height}-hash` }))

  return {
    tryInsertUnprocessedBlock,
    getNextUnprocessedBlockAtHeight,
    getNextUnprocessedBlockAboveHeight,
    getLastProcessedBlock: getMock,
    updateDemand,
    updateMatch2,
    insertDemand,
    insertMatch2,
    insertAttachment,
    insertProcessedBlock,
    withTransaction: sinon.spy(async function (fn: (db: Database) => Promise<void>) {
      await fn({
        getNextUnprocessedBlockAboveHeight,
        getNextUnprocessedBlockAtHeight,
        insertProcessedBlock,
        updateDemand,
        updateMatch2,
        insertDemand,
        insertMatch2,
        insertAttachment,
        tryInsertUnprocessedBlock,
      } as unknown as Database)
    }),
  } as unknown as Database
}

export const withTransactionMatchingTokensInDb = (tx: null | object, tokens: Map<number, string | null>) => {
  return {
    findTransaction: sinon.stub().resolves(tx),
    findLocalIdForToken: sinon.stub().callsFake((id: number) => Promise.resolve(tokens.get(id))),
  } as unknown as Database
}
