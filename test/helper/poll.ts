import Database from '../../src/lib/db/index.js'
import { UUID } from '../../src/models/strings.js'

type Method = 'getTransaction' | 'getDemand' | 'getDemandCommentForTransaction' | 'getMatch2' extends keyof Database
  ? 'getTransaction' | 'getDemand' | 'getDemandCommentForTransaction' | 'getMatch2'
  : never

const getRow = async (db: Database, method: Method, id: string): Promise<{ state: string } | undefined> => {
  switch (method) {
    case 'getTransaction': {
      const [row] = await db.getTransaction(id)
      return row
    }
    case 'getDemand': {
      const [row] = await db.getDemand(id)
      return row
    }
    case 'getDemandCommentForTransaction': {
      const [row] = await db.getDemandCommentForTransaction(id)
      return row
    }
    case 'getMatch2': {
      const [row] = await db.getMatch2(id)
      return row
    }
  }
}

const pollState =
  (method: Method) =>
  async (db: Database, id: UUID | undefined, targetState: string, delay = 100, maxRetry = 100): Promise<void> => {
    try {
      let retry = 0

      const poll = async (): Promise<void> => {
        if (retry >= maxRetry) {
          throw new Error(`Maximum number of retries exceeded while waiting for  ${id} to reach state ${targetState}`)
        }

        const row = await getRow(db, method, id || '')
        if (row && row.state === targetState) {
          return
        }

        retry += 1

        return new Promise((resolve) => setTimeout(resolve, delay)).then(poll)
      }

      await poll()
    } catch (e) {
      throw new Error(`error: ${e.message}`)
    }
  }

export const pollTransactionState = pollState('getTransaction')
export const pollDemandState = pollState('getDemand')
export const pollDemandCommentState = pollState('getDemandCommentForTransaction')
export const pollMatch2State = pollState('getMatch2')
