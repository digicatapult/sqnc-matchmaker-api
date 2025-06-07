import Database from '../../src/lib/db/index.js'
import { UUID } from '../../src/models/strings.js'

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

const pollStateById =
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

export const pollTransactionState = pollStateById('getTransaction')
export const pollDemandState = pollStateById('getDemand')
export const pollDemandCommentState = pollStateById('getDemandCommentForTransaction')
export const pollMatch2State = pollStateById('getMatch2')

export const pollPermissionState = async (
  db: Database,
  owner: string,
  scope: 'member_a' | 'member_b' | 'optimiser',
  delay = 100,
  maxRetry = 100
): Promise<void> => {
  try {
    let retry = 0

    const poll = async (): Promise<void> => {
      if (retry >= maxRetry) {
        throw new Error(`Maximum number of retries exceeded while waiting for permission ${scope} for ${owner}`)
      }

      const [row] = await db.get('permission', { owner, scope })
      if (row) {
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
