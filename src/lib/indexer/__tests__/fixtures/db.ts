import sinon from 'sinon'
import Database from '../../../db'

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
  const upsertDemand = sinon.stub().resolves()
  const upsertMatch2 = sinon.stub().resolves()

  return {
    getLastProcessedBlock: getMock,
    upsertDemand,
    upsertMatch2,
    insertProcessedBlock,
    withTransaction: sinon.spy(async function (fn: (db: Database) => Promise<void>) {
      await fn({
        insertProcessedBlock,
        upsertDemand,
        upsertMatch2,
      } as unknown as Database)
    }),
  } as unknown as Database
}
