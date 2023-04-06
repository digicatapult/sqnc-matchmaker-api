import Database from '../../src/lib/db'
import { DemandState, DemandSubtype } from '../../src/models/demand'
import { Match2State } from '../../src/models/match2'
import { notSelfAddress, selfAddress } from '../helper/mock'
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
export const seededOrderCreationId = 'ff3af974-7d4d-40b4-86a5-00a2241265cb'
export const seededTransactionId = '1f3af974-7d4d-40b4-86a5-94a2241265cb'
export const seededTransactionId2 = 'd65d8e11-150f-4ea4-b778-b920e9dbc378'
export const seededProposalTransactionId = '8a5343dc-88a3-4b61-b156-330d52f506f8'
export const seededAcceptTransactionId = 'd8eb8a94-222b-4481-b315-1dcbf2e07079'
export const seededOrderId = 'ae350c28-f696-4e95-8467-d00507dfcc39'

export const seededMatch2Id = 'f960e4a1-6182-4dd3-8ac2-6f3fad995551'
export const exampleDate = '2023-03-24T10:40:47.317Z'
export const seededOrderWithTokenId = '64d89075-0059-4a8a-87da-c6715d64d0a9'

export const nonExistentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf9'
export const seededCapacityMissingTokenId = 'b2348deb-d967-4317-8637-2867ced70356'
export const seededOrderMissingTokenId = '76b7c704-f9a0-4a80-9554-7268df097798'
export const seededCapacityAlreadyAllocated = '859a1561-a22d-4b09-925e-54ee9f9324cc'
export const seededOrderAlreadyAllocated = '807d1184-9670-4fb0-bb33-28582e5467b1'
export const seededMatch2WithAllocatedDemands = '27965a5f-f3dd-4110-82e7-68f59bb02c2e'
export const seededMatch2AcceptedA = '347411d3-3750-49dd-a548-88e9f2616d9c'
export const seededMatch2AcceptedFinal = '85a50fd9-f20f-4a61-a7e4-3ad49b7c3f21'
export const seededMatch2NotAcceptableA = '46d7dbe8-aaef-472e-af9f-ecdd2681d3a5'
export const seededMatch2NotAcceptableB = '097d3905-72aa-4517-85d2-0091d26fceac'
export const seededMatch2NotAcceptableBoth = '619fb8ca-4dd9-4843-8c7a-9d9c9474784d'

const seededOrderNotOwnedId = 'c88908aa-a2a6-48df-a698-572aa30159c0'
const seededCapacityNotOwnedId = 'b21f865e-f4e9-4ae2-8944-de691e9eb4d9'
const seededCapacityWithTokenId = 'b005f4a1-400e-410e-aa72-8e97385f63e6'
const seededMatch2TokenId = 43
const seededDemandTokenId = 42

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
    },
  ])

  await db.demand().insert([
    {
      id: seededOrderNotOwnedId,
      owner: notSelfAddress,
      subtype: DemandSubtype.order,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
    },
  ])

  await db.demand().insert([
    {
      id: seededCapacityNotOwnedId,
      owner: notSelfAddress,
      subtype: DemandSubtype.capacity,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
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
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
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

  await db.transaction().insert([
    {
      id: seededOrderCreationId,
      api_type: TransactionApiType.order,
      transaction_type: TransactionType.creation,
      local_id: 'ff3af974-7d4d-40b4-86a5-00a2241265ff',
      state: TransactionState.submitted,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.transaction().insert([
    {
      id: seededAcceptTransactionId,
      api_type: TransactionApiType.match2,
      transaction_type: TransactionType.accept,
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
      id: seededCapacityWithTokenId,
      owner: selfAddress,
      subtype: DemandSubtype.capacity,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
    },
  ])

  await db.demand().insert([
    {
      id: seededOrderWithTokenId,
      owner: selfAddress,
      subtype: DemandSubtype.order,
      state: DemandState.created,
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
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

  await db.match2().insert([
    {
      id: seededMatch2AcceptedFinal,
      state: Match2State.acceptedFinal,
      optimiser: selfAddress,
      member_a: selfAddress,
      member_b: selfAddress,
      demand_a_id: seededOrderId,
      demand_b_id: seededCapacityId,
    },
  ])

  await db.match2().insert([
    {
      id: seededMatch2NotAcceptableA,
      state: Match2State.acceptedB,
      optimiser: selfAddress,
      member_a: notSelfAddress,
      member_b: selfAddress,
      demand_a_id: seededOrderNotOwnedId,
      demand_b_id: seededCapacityWithTokenId,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
    },
  ])

  await db.match2().insert([
    {
      id: seededMatch2NotAcceptableB,
      state: Match2State.acceptedA,
      optimiser: selfAddress,
      member_a: selfAddress,
      member_b: notSelfAddress,
      demand_a_id: seededOrderWithTokenId,
      demand_b_id: seededCapacityNotOwnedId,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
    },
  ])

  await db.match2().insert([
    {
      id: seededMatch2NotAcceptableBoth,
      state: Match2State.acceptedB,
      optimiser: selfAddress,
      member_a: notSelfAddress,
      member_b: notSelfAddress,
      demand_a_id: seededOrderNotOwnedId,
      demand_b_id: seededCapacityNotOwnedId,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
    },
  ])
}
