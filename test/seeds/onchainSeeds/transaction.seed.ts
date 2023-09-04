import Database from '../../../src/lib/db'

const db = new Database().db()

export const cleanup = async () => {
  await db.transaction().del()
}

export const seededDemandBId = '0f5af074-7d4d-40b4-86a5-17a2391303cb'
