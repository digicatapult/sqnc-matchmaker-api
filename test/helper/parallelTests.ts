import { Express } from 'express'
import Database, { DemandRow, Match2Row } from '../../src/lib/db/index.js'
import { parametersAttachmentId } from '../seeds/onchainSeeds/onchain.match2.seed.js'
import { post } from './routeHelper.js'
import { pollDemandState, pollMatch2State, pollTransactionState } from './poll.js'
import { expect } from 'chai'
import ChainNode from '../../src/lib/chainNode'
import { Response } from 'supertest'

export type DemandType = { originalTokenId: number; demandId: string; transactionId: any }

export const filterRejectedAndAcceptedPromises = async (promiseResult: PromiseSettledResult<string>[]) => {
  const fulfilledPromises = promiseResult
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
  const rejectedPromises = promiseResult.filter((result) => result.status === 'rejected').map((result) => result.reason)
  return [fulfilledPromises, rejectedPromises]
}

async function createDemand(
  context: { app: Express },
  db: Database,
  demandType: 'demandA' | 'demandB'
): Promise<DemandType> {
  const {
    body: { id: demandId },
  } = await post(context.app, `/v1/${demandType}`, { parametersAttachmentId })

  const {
    body: { id: transactionId },
  } = await post(context.app, `/v1/${demandType}/${demandId}/creation`, {})

  const [demand]: DemandRow[] = await db.getDemand(demandId)

  return {
    originalTokenId: demand.originalTokenId as number,
    demandId: demandId as string,
    transactionId,
  }
}

export async function createMultipleDemands(
  context: { app: Express },
  db: Database,
  demandType: 'demandA' | 'demandB',
  count: number,
  node: ChainNode
) {
  const results = await Promise.allSettled(
    Array(count)
      .fill(null)
      .map(() => createDemand(context, db, demandType))
  )
  await node.clearAllTransactions()

  const fulfilled = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<DemandType>).value)
  const rejected = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)

  if (rejected.length > 0) {
    throw new Error(`${rejected.length} ${demandType}s were rejected with Error: ${rejected[0]}`)
  }

  // Verify states
  for (const demand of fulfilled) {
    await pollTransactionState(db, demand.transactionId, 'finalised')
    await pollDemandState(db, demand.demandId, 'created')
  }

  return fulfilled
}

export async function createMatch2s(
  context: { app: Express },
  fulfilledDemandA: any[],
  fulfilledDemandB: any[],
  node: ChainNode
) {
  const match2Results = await Promise.allSettled(
    fulfilledDemandA.map(async (demandA, index) => {
      const demandB = fulfilledDemandB[index]
      const {
        body: { id: match2Id },
      } = await post(context.app, '/v1/match2', { demandA: demandA.demandId, demandB: demandB.demandId })
      return match2Id
    })
  )
  await node.clearAllTransactions()
  const [fulfilled, rejected] = await filterRejectedAndAcceptedPromises(match2Results)

  // const fulfilled = match2Results
  //   .filter((r) => r.status === 'fulfilled')
  //   .map((r) => (r as PromiseFulfilledResult<string>).value)
  // const rejected = match2Results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)

  if (rejected.length > 0) {
    throw new Error(`${rejected.length} prepared match2s rejected with error: ${rejected[0]}`)
  }

  return fulfilled
}

export async function submitAndVerifyTransactions(
  context: { app: Express },
  db: Database,
  node: ChainNode,
  items: string[],
  endpoint: string,
  expectedState: string,
  additionalPath: string = '',
  attachmentId: string = '',
  status: number = 201
) {
  const data = attachmentId !== '' ? { attachmentId: parametersAttachmentId } : null
  let response: Response
  const transactionResults = await Promise.allSettled(
    items.map(async (itemId) => {
      if (data !== null) {
        response = await post(context.app, `/v1/${endpoint}/${itemId}/${additionalPath}`, data)
      } else {
        response = await post(context.app, `/v1/${endpoint}/${itemId}/${additionalPath}`, {})
      }
      expect(response.status).to.equal(status)

      const { id: transactionId, state } = response.body

      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      return transactionId
    })
  )

  await node.clearAllTransactions()

  const [fulfilled, rejected] = await filterRejectedAndAcceptedPromises(transactionResults)

  if (rejected.length > 0) {
    throw new Error(`${rejected.length} transactions rejected with error: ${rejected[0]}`)
  }

  // Poll transactions for finalised state
  for (const transactionId of fulfilled) {
    await pollTransactionState(db, transactionId, expectedState)
  }

  return fulfilled
}

export async function verifyMatch2State(match2Ids: string[], expectedState: string, db: Database) {
  const results = await Promise.allSettled(match2Ids.map((match2Id) => pollMatch2State(db, match2Id, expectedState)))

  const rejected = await rejectedPromises(results)
  if (rejected.length > 0) {
    throw new Error(`${rejected.length} match2s failed to reach state ${expectedState} with error: ${rejected[0]}`)
  }
}

export async function verifyDemandState(demandIds: { demandId: string }[], expectedState: string, db: Database) {
  const results = await Promise.allSettled(
    demandIds.map(async ({ demandId }) => {
      const [maybeDemand] = await db.getDemand(demandId)
      const demand = maybeDemand as DemandRow
      expect(demand.state).to.equal(expectedState)
    })
  )

  const rejected = await rejectedPromises(results)
  if (rejected.length > 0) {
    throw new Error(`${rejected.length} demands failed to reach state ${expectedState} with error: ${rejected[0]}`)
  }
}

export async function verifyMatch2DatabaseState(match2Ids: string[], expectedState: string, db: Database) {
  const results = await Promise.allSettled(
    match2Ids.map(async (match2Id) => {
      const [maybeMatch2] = await db.getMatch2(match2Id)
      const match2 = maybeMatch2 as Match2Row
      expect(match2.state).to.equal(expectedState)
    })
  )

  const rejected = await rejectedPromises(results)
  if (rejected.length > 0) {
    throw new Error(
      `${rejected.length} match2s in the database failed to reach state ${expectedState} with error: ${rejected[0]}`
    )
  }
}
export async function createRematch2(context: { app: Express }, demandA: any, demandB: any, replacingMatch2: string) {
  try {
    const {
      body: { id: rematch2Id },
    } = await post(context.app, '/v1/match2', {
      demandA: demandA.demandId,
      demandB: demandB.demandId,
      replaces: replacingMatch2,
    })
    return rematch2Id
  } catch (error) {
    return Promise.reject(error) // Reject the promise if something goes wrong
  }
}

export async function createMultipleRematches(
  context: { app: Express },
  fulfilledDemandAIds: any[],
  fulfilledNewDemandBIds: any[],
  fulfilledMatch2s: any[],
  node: ChainNode
) {
  const rematch2Results = await Promise.allSettled(
    fulfilledDemandAIds.map(async (demandA, index) => {
      const demandB = fulfilledNewDemandBIds[index]
      const replacingMatch2 = fulfilledMatch2s[index]

      try {
        const rematch2Id = await createRematch2(context, demandA, demandB, replacingMatch2)
        return rematch2Id
      } catch (error) {
        return Promise.reject(error)
      }
    })
  )

  // Filter out fulfilled results and rejected ones
  const [rematch2Ids, rejectedRematches] = await filterRejectedAndAcceptedPromises(rematch2Results)

  if (rejectedRematches.length > 0) {
    throw new Error(`${rejectedRematches.length} rematches were rejected`)
  }

  await node.clearAllTransactions()
  return rematch2Ids
}

async function rejectedPromises(results: PromiseSettledResult<void>[]) {
  const rejected = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)
  return rejected
}
