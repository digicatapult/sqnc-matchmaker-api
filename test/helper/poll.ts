import type Database from '../../src/lib/db/index.js'
import type { UUID } from '../../src/models/strings.js'

type Method = 'getTransaction' | 'getDemand' | 'getDemandCommentForTransaction' | 'getMatch2'

const getRow = async (db: Database, method: Method, id: string): Promise<{ state: string } | undefined> => {
  switch (method) {
    case 'getTransaction': {
      const [row] = await db.get('transaction', { id })
      return row
    }
    case 'getDemand': {
      const [row] = await db.get('demand', { id })
      return row
    }
    case 'getDemandCommentForTransaction': {
      const [row] = await db.get('demand_comment', { transaction_id: id })
      return row
    }
    case 'getMatch2': {
      const [row] = await db.get('match2', { id })
      return row
    }
  }
}

const pollState =
  (method: Method) =>
  async (db: Database, id: UUID, targetState: string, delay = 100, maxRetry = 100): Promise<void> => {
    try {
      let retry = 0

      const poll = async (): Promise<void> => {
        if (retry >= maxRetry) {
          throw new Error(
            `Maximum number of retries exceeded while waiting for ${method}(${id}) to reach state ${targetState}`
          )
        }

        const row = await getRow(db, method, id)
        if (row && row.state === targetState) {
          return
        }

        retry += 1

        return new Promise((resolve) => setTimeout(resolve, delay)).then(poll)
      }

      await poll()
    } catch (e) {
      const err = e as Error
      throw new Error(`error: ${err.message}`)
    }
  }

export const pollTransactionState = pollState('getTransaction')
export const pollDemandState = pollState('getDemand')
export const pollDemandCommentState = pollState('getDemandCommentForTransaction')
export const pollMatch2State = pollState('getMatch2')
