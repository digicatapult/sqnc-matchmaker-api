import Database from '../../src/lib/db/index.js'
import { TransactionResponse } from '../../src/models/transaction.js'
import { UUID } from '../../src/models/strings.js'

type Method = 'getTransaction' | 'getDemand' | 'getDemandCommentForTransaction' | 'getMatch2' extends keyof Database
  ? 'getTransaction' | 'getDemand' | 'getDemandCommentForTransaction' | 'getMatch2'
  : never

const pollState =
  (method: Method) =>
  async (db: Database, id: UUID | undefined, targetState: string, delay = 100, maxRetry = 100): Promise<void> => {
    let retry = 0

    const poll = async (): Promise<TransactionResponse> => {
      if (retry >= maxRetry) {
        throw new Error(`Maximum number of retries exceeded while waiting for  ${id} to reach state ${targetState}`)
      }

      const [row] = await db[method](id)
      if (row && row.state === targetState) {
        return row
      }

      retry += 1

      return new Promise((resolve) => setTimeout(resolve, delay)).then(poll)
    }

    await poll()
  }

export const pollTransactionState = pollState('getTransaction')
export const pollDemandState = pollState('getDemand')
export const pollDemandCommentState = pollState('getDemandCommentForTransaction')
export const pollMatch2State = pollState('getMatch2')
