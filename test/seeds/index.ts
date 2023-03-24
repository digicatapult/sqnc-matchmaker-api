import Database from '../../src/lib/db'
import { DemandState, DemandSubtype } from '../../src/models/demand'
import { Match2State } from '../../src/models/match2'
import { selfAddress } from '../helper/mock'
import { TokenType } from '../../src/models/tokenType'

const db = new Database().db()

export const cleanup = async () => {
  await db.attachment().del()
  await db.demand().del()
  await db.transaction().del()
  await db.match2().del()
}

export const parametersAttachmentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf8'
export const seededCapacityId = '0f5af074-7d4d-40b4-86a5-17a2391303cb'
export const seededTransactionId = '1f3af974-7d4d-40b4-86a5-94a2241265cb'
export const seededOrderId = 'ae350c28-f696-4e95-8467-d00507dfcc39'
export const seededMatch2Id = 'f960e4a1-6182-4dd3-8ac2-6f3fad995551'

export const nonExistentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf9'

export const seed = async () => {
  await cleanup()

  await db.attachment().insert([
    {
      id: parametersAttachmentId,
      filename: 'test.txt',
      binary_blob: 9999999,
    },
  ])

  await db.demand().insert([
    {
      id: seededCapacityId,
      owner: selfAddress,
      subtype: DemandSubtype.capacity,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
    },
  ])

  await db.transaction().insert([
    {
      id: seededTransactionId,
      token_type: TokenType.DEMAND,
      local_id: seededCapacityId,
      state: DemandState.created,
      token_id: 6006,
    },
  ])

  await db.demand().insert([
    {
      id: seededOrderId,
      owner: selfAddress,
      subtype: DemandSubtype.order,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
    },
  ])

  await db.match2().insert([
    {
      id: seededMatch2Id,
      state: Match2State.proposed,
      optimiser: selfAddress,
      member_a: selfAddress,
      member_b: selfAddress,
      demand_a_id: seededOrderId,
      demand_b_id: seededCapacityId,
    },
  ])
}
