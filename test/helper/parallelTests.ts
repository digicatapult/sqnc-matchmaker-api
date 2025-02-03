import { Express } from 'express'
import Database, { DemandRow } from '../../src/lib/db/index.js'
import { parametersAttachmentId } from '../seeds/onchainSeeds/onchain.match2.seed.js'
import { post } from './routeHelper.js'
import { pollDemandState, pollTransactionState } from './poll.js'
import { expect } from 'chai'

export const filterRejectedAndAcceptedPromises = async (promiseResult: PromiseSettledResult<string>[]) => {
  const fulfilledPromises = promiseResult
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
  const rejectedPromises = promiseResult.filter((result) => result.status === 'rejected').map((result) => result.reason)
  return [fulfilledPromises, rejectedPromises]
}

export const filterRejectedAndAcceptedPromisesForMatch2 = async (
  promiseResult:
    | PromiseSettledResult<{
        originalDemandA: number
        demandA: string
        transactionId: any
      }>[]
    | PromiseSettledResult<{
        originalDemandB: number
        demandB: string
        transactionId: any
      }>[]
) => {
  const fulfilledPromises = promiseResult
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
  const rejectedPromises = promiseResult.filter((result) => result.status === 'rejected').map((result) => result.reason)
  return [fulfilledPromises, rejectedPromises]
}

async function createDemand(context: { app: Express }, db: Database, demandType: 'demandA' | 'demandB') {
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

async function createMultipleDemands(
  context: { app: Express },
  db: Database,
  demandType: 'demandA' | 'demandB',
  count: number
) {
  const results = await Promise.allSettled(
    Array(count)
      .fill(null)
      .map(() => createDemand(context, db, demandType))
  )

  const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<any>).value)
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

async function createMatch2s(context: { app: Express }, fulfilledDemandA: any[], fulfilledDemandB: any[], node: any) {
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

  const fulfilled = match2Results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<string>).value)
  const rejected = match2Results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)

  if (rejected.length > 0) {
    throw new Error(`${rejected.length} prepared match2s rejected with error: ${rejected[0]}`)
  }

  return fulfilled
}

async function submitAndVerifyTransactions(
  context: { app: Express },
  db: Database,
  node: any,
  items: string[],
  endpoint: string,
  expectedState: string
) {
  const transactionResults = await Promise.allSettled(
    items.map(async (itemId) => {
      const response = await post(context.app, `/v1/${endpoint}/${itemId}`, {})
      expect(response.status).to.equal(201)

      const { id: transactionId, state } = response.body
      expect(transactionId).to.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      )
      expect(state).to.equal('submitted')

      return transactionId
    })
  )

  await node.clearAllTransactions()

  const fulfilled = transactionResults
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<string>).value)
  const rejected = transactionResults
    .filter((r) => r.status === 'rejected')
    .map((r) => (r as PromiseRejectedResult).reason)

  if (rejected.length > 0) {
    throw new Error(`${rejected.length} transactions rejected with error: ${rejected[0]}`)
  }

  // Poll transactions for finalised state
  for (const transactionId of fulfilled) {
    await pollTransactionState(db, transactionId, expectedState)
  }

  return fulfilled
}
