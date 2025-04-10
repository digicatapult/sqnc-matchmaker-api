import { container } from 'tsyringe'
import Database from '../../../src/lib/db/index.js'

export const cleanup = async () => {
  const db = container.resolve(Database)
  await db.delete('demand', {})
  await db.delete('transaction', {})
  await db.delete('match2', {})
}
