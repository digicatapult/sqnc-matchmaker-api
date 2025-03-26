import { container } from 'tsyringe'
import Database from '../../../src/lib/db/index.js'

export const cleanup = async () => {
  const db = container.resolve(Database).db()
  await db.demand().del()
  await db.transaction().del()
  await db.match2().del()
}
