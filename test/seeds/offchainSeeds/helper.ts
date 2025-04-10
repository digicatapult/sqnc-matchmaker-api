import Database from '../../../src/lib/db/index.js'
import { Models, TABLE } from '../../../src/lib/db/types.js'

export const dbInsert =
  (db: Database) =>
  async <M extends TABLE>(model: M, records: Models[typeof model]['get'][]) => {
    for (const record of records) {
      await db.insert(model, record)
    }
  }
