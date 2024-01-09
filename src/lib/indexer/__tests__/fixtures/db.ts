import sinon from 'sinon'

import Database from '../../../db/index.js'

type LastProcessBlockResult = { hash: string; parent: string; height: number } | null

export const withLastProcessedBlocksByCall = (calls: LastProcessBlockResult[]) => {
  let getMock = sinon.stub().resolves(calls.at(-1))
  for (let i = 0; i < calls.length; i++) {
    getMock = getMock.onCall(i).resolves(calls[i])
  }

  const insertProcessedBlock = sinon.stub().resolves()

  const self = {
    getLastProcessedBlock: getMock,
    withTransaction: sinon.spy(async function (fn: (db: Database) => Promise<void>) {
      await fn({
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

  return {
    getLastProcessedBlock: getMock,
    updateDemand,
    updateMatch2,
    insertDemand,
    insertMatch2,
    insertAttachment,
    insertProcessedBlock,
    withTransaction: sinon.spy(async function (fn: (db: Database) => Promise<void>) {
      await fn({
        insertProcessedBlock,
        updateDemand,
        updateMatch2,
        insertDemand,
        insertMatch2,
        insertAttachment,
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
