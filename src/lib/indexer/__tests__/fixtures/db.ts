import sinon from 'sinon'

import type Attachment from '../../../services/attachment.js'
import type { IndexerDatabaseExtensions } from '../../indexerDb.js'

type LastProcessBlockResult = { hash: string; parent: string; height: bigint } | null

export const withLastProcessedBlocksByCall = (calls: LastProcessBlockResult[]) => {
  let getMock = sinon.stub().resolves(calls.at(-1))
  for (let i = 0; i < calls.length; i++) {
    getMock = getMock.onCall(i).resolves(calls[i])
  }

  const insertProcessedBlock = sinon.stub().resolves()
  const getNextUnprocessedBlockAboveHeight = sinon
    .stub()
    .callsFake((height) => Promise.resolve({ hash: `${height}-hash`, height: BigInt(height) }))
  const tryInsertUnprocessedBlock = sinon.stub().resolves()
  const getNextUnprocessedBlockAtHeight = sinon
    .stub()
    .callsFake((height) => Promise.resolve({ hash: `${height}-hash`, height: BigInt(height) }))

  const self = {
    tryInsertUnprocessedBlock,
    getNextUnprocessedBlockAtHeight,
    getNextUnprocessedBlockAboveHeight,
    getLastProcessedBlock: sinon.stub().resolves(calls[2]),
    withTransaction: sinon.spy(async function (fn: (db: IndexerDatabaseExtensions) => Promise<void>) {
      await fn({
        tryInsertUnprocessedBlock,
        getNextUnprocessedBlockAtHeight,
        getNextUnprocessedBlockAboveHeight,
        insertProcessedBlock,
      } as unknown as IndexerDatabaseExtensions)
    }),
  } as unknown as IndexerDatabaseExtensions

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
  const getNextUnprocessedBlockAboveHeight = sinon
    .stub()
    .callsFake((height) => ({ hash: `${height}-hash`, height: BigInt(height) }))
  const tryInsertUnprocessedBlock = sinon.stub().resolves()
  const getNextUnprocessedBlockAtHeight = sinon
    .stub()
    .callsFake((height) => Promise.resolve({ hash: `${height}-hash`, height: BigInt(height) }))

  return {
    tryInsertUnprocessedBlock,
    getNextUnprocessedBlockAtHeight,
    getNextUnprocessedBlockAboveHeight,
    getLastProcessedBlock: getMock,
    updateDemand,
    updateMatch2,
    insertDemand,
    insertMatch2,
    insertProcessedBlock,
    withTransaction: sinon.spy(async function (fn: (db: IndexerDatabaseExtensions) => Promise<void>) {
      await fn({
        getNextUnprocessedBlockAboveHeight,
        getNextUnprocessedBlockAtHeight,
        insertProcessedBlock,
        updateDemand,
        updateMatch2,
        insertDemand,
        insertMatch2,
        tryInsertUnprocessedBlock,
      } as unknown as IndexerDatabaseExtensions)
    }),
  } as unknown as IndexerDatabaseExtensions
}

export const withInitialLastProcessedBlockAndTxError = (initial: LastProcessBlockResult) => {
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
  const getNextUnprocessedBlockAboveHeight = sinon
    .stub()
    .callsFake((height) => ({ hash: `${height}-hash`, height: BigInt(height) }))
  const tryInsertUnprocessedBlock = sinon.stub().resolves()
  const getNextUnprocessedBlockAtHeight = sinon
    .stub()
    .callsFake((height) => Promise.resolve({ hash: `${height}-hash`, height: BigInt(height) }))

  return {
    tryInsertUnprocessedBlock,
    getNextUnprocessedBlockAtHeight,
    getNextUnprocessedBlockAboveHeight,
    getLastProcessedBlock: getMock,
    updateDemand,
    updateMatch2,
    insertDemand,
    insertMatch2,
    insertProcessedBlock,
    withTransaction: sinon
      .stub()
      .callsFake(async function (fn: (db: IndexerDatabaseExtensions) => Promise<void>) {
        await fn({
          getNextUnprocessedBlockAboveHeight,
          getNextUnprocessedBlockAtHeight,
          insertProcessedBlock,
          updateDemand,
          updateMatch2,
          insertDemand,
          insertMatch2,
          tryInsertUnprocessedBlock,
        } as unknown as IndexerDatabaseExtensions)
      })
      .onFirstCall()
      .rejects(new Error('Transaction error')),
  } as unknown as IndexerDatabaseExtensions
}

export const withMockAttachment = () => {
  return {
    insertAttachment: sinon.stub().callsFake((hash, owner) => Promise.resolve({ id: `${hash}-${owner}` })),
    deleteAttachment: sinon.stub().resolves(),
  } as unknown as Attachment
}

export const withTransactionMatchingTokensInDb = (tx: null | object, tokens: Map<number, string | null>) => {
  return {
    findTransaction: sinon.stub().resolves(tx),
    findLocalIdForToken: sinon.stub().callsFake((id: number) => Promise.resolve(tokens.get(id))),
  } as unknown as IndexerDatabaseExtensions
}
