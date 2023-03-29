import Database from '../../src/lib/db'
import { DemandState, DemandSubtype } from '../../src/models/demand'
import { Match2State } from '../../src/models/match2'
import { selfAddress } from '../helper/mock'
import { TokenType } from '../../src/models/tokenType'
import { TransactionState, TransactionApiType, TransactionType } from '../../src/models/transaction'

const db = new Database().db()

export const cleanup = async () => {
  await db.attachment().del()
  await db.demand().del()
  await db.transaction().del()
  await db.match2().del()
}

export const parametersAttachmentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf8'
export const seededCapacityId = '0f5af074-7d4d-40b4-86a5-17a2391303cb'
export const seededCapacityTokenId = 12
export const seededTransactionId = '1f3af974-7d4d-40b4-86a5-94a2241265cb'
export const seededTransactionId2 = 'd65d8e11-150f-4ea4-b778-b920e9dbc378'
export const seededProposalTransactionId = '8a5343dc-88a3-4b61-b156-330d52f506f8'
export const seededOrderId = 'ae350c28-f696-4e95-8467-d00507dfcc39'
export const seededOrderTokenId = 11
export const seededMatch2Id = 'f960e4a1-6182-4dd3-8ac2-6f3fad995551'
export const exampleDate = '2023-03-24T10:40:47.317Z'

export const nonExistentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf9'
export const seededCapacityMissingTokenId = 'b2348deb-d967-4317-8637-2867ced70356'
export const seededOrderMissingTokenId = '76b7c704-f9a0-4a80-9554-7268df097798'
export const seededCapacityAlreadyAllocated = '859a1561-a22d-4b09-925e-54ee9f9324cc'
export const seededOrderAlreadyAllocated = '807d1184-9670-4fb0-bb33-28582e5467b1'
export const seededMatch2WithAllocatedDemands = '27965a5f-f3dd-4110-82e7-68f59bb02c2e'
export const seededMatch2AcceptedA = '347411d3-3750-49dd-a548-88e9f2616d9c'

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

  await db.transaction().insert([
    {
      id: seededTransactionId,
      api_type: TransactionApiType.capacity,
      transaction_type: TransactionType.creation,
      local_id: seededCapacityId,
      state: TransactionState.submitted,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.transaction().insert([
    {
      id: seededTransactionId2,
      api_type: TransactionApiType.capacity,
      transaction_type: TransactionType.creation,
      local_id: seededCapacityId,
      state: TransactionState.submitted,
      created_at: exampleDate,
      updated_at: exampleDate,
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

  await db.transaction().insert([
    {
      id: seededProposalTransactionId,
      api_type: TransactionApiType.match2,
      transaction_type: TransactionType.proposal,
      local_id: seededMatch2Id,
      state: TransactionState.submitted,
      created_at: exampleDate,
      updated_at: exampleDate,
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

  await db.demand().insert([
    {
      id: seededCapacityAlreadyAllocated,
      owner: selfAddress,
      subtype: DemandSubtype.capacity,
      state: DemandState.allocated,
      parameters_attachment_id: parametersAttachmentId,
    },
  ])

  await db.demand().insert([
    {
      id: seededOrderAlreadyAllocated,
      owner: selfAddress,
      subtype: DemandSubtype.order,
      state: DemandState.allocated,
      parameters_attachment_id: parametersAttachmentId,
    },
  ])

  await db.match2().insert([
    {
      id: seededMatch2WithAllocatedDemands,
      state: Match2State.proposed,
      optimiser: selfAddress,
      member_a: selfAddress,
      member_b: selfAddress,
      demand_a_id: seededOrderAlreadyAllocated,
      demand_b_id: seededCapacityAlreadyAllocated,
    },
  ])

  await db.match2().insert([
    {
      id: seededMatch2AcceptedA,
      state: Match2State.acceptedA,
      optimiser: selfAddress,
      member_a: selfAddress,
      member_b: selfAddress,
      demand_a_id: seededOrderId,
      demand_b_id: seededCapacityId,
    },
  ])
}
