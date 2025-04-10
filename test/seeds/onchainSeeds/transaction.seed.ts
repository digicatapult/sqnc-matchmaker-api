import { container } from 'tsyringe'
import Database from '../../../src/lib/db/index.js'

export const cleanup = async () => {
  const db = container.resolve(Database)
  await db.delete('transaction', {})
}

export const seededDemandBId = '0f5af074-7d4d-40b4-86a5-17a2391303cb'
