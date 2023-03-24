import Database from '../../src/lib/db'
import { DemandState, DemandSubtype } from '../../src/models/demand'
import { Match2State } from '../../src/models/match2'
import { selfAddress } from '../helper/mock'

const db = new Database().db()

export const cleanup = async () => {
  await db.attachment().del()
  await db.demand().del()
  await db.match2().del()
}

export const parametersAttachmentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf8'
export const seededCapacityId = '0f5af074-7d4d-40b4-86a5-17a2391303cb'
export const seededCapacityTokenId = 12
export const seededOrderId = 'ae350c28-f696-4e95-8467-d00507dfcc39'
export const seededOrderTokenId = 11
export const seededMatch2Id = 'f960e4a1-6182-4dd3-8ac2-6f3fad995551'

export const nonExistentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf9'
export const seededCapacityMissingTokenId = 'b2348deb-d967-4317-8637-2867ced70356'
export const seededOrderMissingTokenId = '76b7c704-f9a0-4a80-9554-7268df097798'

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
      latest_token_id: seededCapacityTokenId,
      original_token_id: seededCapacityTokenId,
    },
  ])

  await db.demand().insert([
    {
      id: seededOrderId,
      owner: selfAddress,
      subtype: DemandSubtype.order,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededOrderTokenId,
      original_token_id: seededOrderTokenId,
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

  await db.demand().insert([
    {
      id: seededCapacityMissingTokenId,
      owner: selfAddress,
      subtype: DemandSubtype.capacity,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
    },
  ])

  await db.demand().insert([
    {
      id: seededOrderMissingTokenId,
      owner: selfAddress,
      subtype: DemandSubtype.order,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
    },
  ])
}
