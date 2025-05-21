import { container } from 'tsyringe'
import Database from '../../../src/lib/db/index.js'
import { notSelfAddress, parametersAttachmentId, proxyAddress } from '../../helper/mock.js'
import { dbInsert } from './helper.js'

export const cleanup = async () => {
  const db = container.resolve(Database)
  await db.delete('demand', {})
  await db.delete('transaction', {})
  await db.delete('match2', {})
}

export const transactionHash = '0000000000000000000000000000000000000000000000000000000000000000'

export const seededDemandAId = 'ae350c28-f696-4e95-8467-d00507dfcc39'
export const seededDemandBId = '0f5af074-7d4d-40b4-86a5-17a2391303cb'
export const seededDemandACreationTransactionId = 'bfd86663-9b2f-4f38-86e5-acdafa5f57fc'
export const seededDemandBCreationTransactionId = '1f3af974-7d4d-40b4-86a5-94a2241265cb'
export const seededDemandACreationTransactionId2 = 'ffe850b4-4a17-47a6-9d3d-6d0c87b1f9c4'
export const seededDemandBCreationTransactionId2 = 'd65d8e11-150f-4ea4-b778-b920e9dbc378'
export const seededDemandACommentTransactionId = '07e0511a-6041-40df-9d5b-2e5966fa9a4a'
export const seededDemandBCommentTransactionId = '07e0511a-6041-40df-9d5b-2e5966fa9a48'
export const seededDemandACommentTransactionId2 = '3e1b64cc-62e4-417c-b73e-e4f28336012a'
export const seededDemandBCommentTransactionId2 = '3e1b64cc-62e4-417c-b73e-e4f28336012b'
export const seededProposalTransactionId = '8a5343dc-88a3-4b61-b156-330d52f506f8'
export const seededAcceptTransactionId = 'd8eb8a94-222b-4481-b315-1dcbf2e07079'
export const seededRejectionTransactionId = 'd8eb8a94-222b-4481-b315-1dcbf2e07078'

export const seededMatch2Id = 'f960e4a1-6182-4dd3-8ac2-6f3fad995551'
export const exampleDate = '2023-01-01T00:00:00.000Z'
export const seededDemandAWithTokenId = '64d89075-0059-4a8a-87da-c6715d64d0a9'
export const seededDemandBWithTokenId = 'b005f4a1-400e-410e-aa72-8e97385f63e6'
export const seededDemandACrated = '64d89a75-0059-4a8a-87da-c6715d64d0a9'
export const seededRematch2DemndACreated = 'b4d89075-0059-4a8a-87da-c6715d64d0a9'

export const nonExistentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf9'
export const seededDemandBMissingTokenId = 'b2348deb-d967-4317-8637-2867ced70356'
export const seededDemandAMissingTokenId = '76b7c704-f9a0-4a80-9554-7268df097798'
export const seededDemandBAlreadyAllocated = '859a1561-a22d-4b09-925e-54ee9f9324cc'
export const seededDemandAAllocated = '807d1184-9670-4fb0-bb33-28582e5467aa'
export const seededDemandBCrated = '859a1561-a22d-4b09-925e-54ee9f9324bb'
export const seededDemandAAlreadyAllocated = '807d1184-9670-4fb0-bb33-28582e5467b1'
export const seededMatch2WithAllocatedDemands = '27965a5f-f3dd-4110-82e7-68f59bb02c2e'
export const seededMatch2AcceptedA = '347411d3-3750-49dd-a548-88e9f2616d9c'
export const seededMatch2AcceptedFinal = '85a50fd9-f20f-4a61-a7e4-3ad49b7c3f21'
export const seededMatch2CancellationId = '85a50fd9-f20f-4a61-a7e4-3ad49b7c3f22'
export const seededMatch2CancellationId2 = '85a50fd9-f20f-4a61-a7e4-3ad49b7c3f23'
export const seededMatch2Rematch2Accept = '85a50fd9-f20f-4a61-a7e4-3ad49b7c3f11'
export const seededMatch2Rematch2AcceptFinal = '85a50fd9-f20f-4a61-a7e4-3ad49b7c3fbb'
export const seededRematch2DemndBAllocated = '85a50fd9-f20f-4a61-a7e4-3ad49b7c3fcb'
export const seededRematch2InvalidReplace = '85a50fd9-f20f-4a61-a7e4-3ad49b7c3fcc'
export const seededMatch2NotAcceptableA = '46d7dbe8-aaef-472e-af9f-ecdd2681d3a5'
export const seededMatch2NotAcceptableB = '097d3905-72aa-4517-85d2-0091d26fceac'
export const seededMatch2NotAcceptableBoth = '619fb8ca-4dd9-4843-8c7a-9d9c9474784d'
export const seededMatch2NotInRoles = '619fb8ca-4dd9-4843-8c7a-9d9c9474784e'
export const seededMatch2IsMemberId = '619fb8ca-4dd9-4843-8c7a-9d9c9474784f'
export const seededMatch2IsNotMemberId = '619fb8ca-4dd9-4843-8c7a-9d9c9474784d'
export const seededMatch2IsNotMemberInReplacesId = '619fb8ca-4dd9-4843-8c7a-9d9c9474784a'

const seededDemandANotOwnedId = 'c88908aa-a2a6-48df-a698-572aa30159c0'
const seededDemandBNotOwnedId = 'b21f865e-f4e9-4ae2-8944-de691e9eb4d9'
const seededMatch2TokenId = 43
const seededDemandTokenId = 42

export const match2Seed = async () => {
  const db = container.resolve(Database)
  const insert = dbInsert(db)
  await cleanup()

  await insert('demand', [
    {
      id: seededDemandBId,
      owner: proxyAddress,
      subtype: 'demand_b',
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('transaction', [
    {
      id: seededDemandBCreationTransactionId,
      api_type: 'demand_b',
      transaction_type: 'creation',
      local_id: seededDemandBId,
      state: 'submitted',
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      hash: transactionHash,
    },
  ])

  await insert('demand', [
    {
      id: seededDemandAId,
      owner: proxyAddress,
      subtype: 'demand_a',
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('demand', [
    {
      id: seededDemandANotOwnedId,
      owner: notSelfAddress,
      subtype: 'demand_a',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
    },
  ])

  await insert('demand', [
    {
      id: seededDemandBNotOwnedId,
      owner: notSelfAddress,
      subtype: 'demand_b',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
    },
  ])

  await insert('demand', [
    {
      id: seededDemandBMissingTokenId,
      owner: proxyAddress,
      subtype: 'demand_b',
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('demand', [
    {
      id: seededDemandAMissingTokenId,
      owner: proxyAddress,
      subtype: 'demand_a',
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('demand', [
    {
      id: seededDemandBWithTokenId,
      owner: proxyAddress,
      subtype: 'demand_b',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
    },
  ])

  await insert('demand', [
    {
      id: seededDemandAWithTokenId,
      owner: proxyAddress,
      subtype: 'demand_a',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
    },
  ])

  await insert('demand', [
    {
      id: seededDemandBAlreadyAllocated,
      owner: proxyAddress,
      subtype: 'demand_b',
      state: 'allocated',
      parameters_attachment_id: parametersAttachmentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('demand', [
    {
      id: seededDemandAAlreadyAllocated,
      owner: proxyAddress,
      subtype: 'demand_a',
      state: 'allocated',
      parameters_attachment_id: parametersAttachmentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('match2', [
    {
      id: seededMatch2Id,
      state: 'pending',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandAId,
      demand_b_id: seededDemandBId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
      replaces_id: null,
    },
  ])

  await insert('transaction', [
    {
      id: seededProposalTransactionId,
      api_type: 'match2',
      transaction_type: 'proposal',
      local_id: seededMatch2Id,
      state: 'submitted',
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      hash: transactionHash,
    },
  ])

  await insert('transaction', [
    {
      id: seededAcceptTransactionId,
      api_type: 'match2',
      transaction_type: 'accept',
      local_id: seededMatch2Id,
      state: 'submitted',
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      hash: transactionHash,
    },
  ])

  await insert('transaction', [
    {
      id: seededRejectionTransactionId,
      api_type: 'match2',
      transaction_type: 'rejection',
      local_id: seededMatch2Id,
      state: 'submitted',
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      hash: transactionHash,
    },
  ])

  await insert('match2', [
    {
      id: seededMatch2WithAllocatedDemands,
      state: 'pending',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandAAlreadyAllocated,
      demand_b_id: seededDemandBAlreadyAllocated,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
      replaces_id: null,
    },
  ])

  await insert('match2', [
    {
      id: seededMatch2AcceptedA,
      state: 'acceptedA',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandAId,
      demand_b_id: seededDemandBId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
      replaces_id: null,
    },
  ])

  //added token ids to this match
  await insert('match2', [
    {
      id: seededMatch2AcceptedFinal,
      state: 'acceptedFinal',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandAId,
      demand_b_id: seededDemandBId,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: null,
    },
  ])

  await insert('transaction', [
    {
      id: seededMatch2CancellationId,
      api_type: 'match2',
      transaction_type: 'cancellation',
      local_id: seededMatch2Id,
      state: 'submitted',
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      hash: transactionHash,
    },
  ])

  await insert('transaction', [
    {
      id: seededMatch2CancellationId2,
      api_type: 'match2',
      transaction_type: 'cancellation',
      local_id: seededMatch2Id,
      state: 'submitted',
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      hash: transactionHash,
    },
  ])

  await insert('match2', [
    {
      id: seededMatch2NotAcceptableA,
      state: 'acceptedB',
      optimiser: proxyAddress,
      member_a: notSelfAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandANotOwnedId,
      demand_b_id: seededDemandBWithTokenId,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: null,
    },
  ])

  await insert('match2', [
    {
      id: seededMatch2NotAcceptableB,
      state: 'acceptedA',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: notSelfAddress,
      demand_a_id: seededDemandAWithTokenId,
      demand_b_id: seededDemandBNotOwnedId,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: null,
    },
  ])

  await insert('match2', [
    {
      id: seededMatch2NotAcceptableBoth,
      state: 'acceptedB',
      optimiser: proxyAddress,
      member_a: notSelfAddress,
      member_b: notSelfAddress,
      demand_a_id: seededDemandANotOwnedId,
      demand_b_id: seededDemandBNotOwnedId,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: null,
    },
  ])

  await insert('match2', [
    {
      id: seededMatch2NotInRoles,
      state: 'acceptedB',
      optimiser: notSelfAddress,
      member_a: notSelfAddress,
      member_b: notSelfAddress,
      demand_a_id: seededDemandANotOwnedId,
      demand_b_id: seededDemandBNotOwnedId,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: null,
    },
  ])

  // * rematch2-accept
  await insert('demand', [
    {
      id: seededDemandAAllocated,
      owner: proxyAddress,
      subtype: 'demand_a',
      state: 'allocated',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
    },
    {
      id: seededDemandBCrated,
      owner: proxyAddress,
      subtype: 'demand_b',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
    },
    {
      id: seededDemandACrated,
      owner: proxyAddress,
      subtype: 'demand_a',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
    },
  ])

  await insert('match2', [
    {
      id: seededRematch2DemndACreated,
      state: 'acceptedA',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandACrated,
      demand_b_id: seededDemandBCrated,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: seededMatch2AcceptedFinal,
    },
    {
      id: seededRematch2DemndBAllocated,
      state: 'acceptedA',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandAAllocated,
      demand_b_id: seededDemandBAlreadyAllocated,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: seededMatch2AcceptedFinal,
    },
    {
      id: seededMatch2Rematch2Accept,
      state: 'acceptedA',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandAAllocated,
      demand_b_id: seededDemandBCrated,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: seededMatch2AcceptedFinal,
    },
    {
      id: seededMatch2Rematch2AcceptFinal,
      state: 'acceptedA',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandAAllocated,
      demand_b_id: seededDemandBCrated,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: seededMatch2AcceptedFinal,
    },
    {
      id: seededMatch2IsNotMemberInReplacesId,
      state: 'pending',
      optimiser: proxyAddress,
      member_a: proxyAddress,
      member_b: proxyAddress,
      demand_a_id: seededDemandAAllocated,
      demand_b_id: seededDemandBCrated,
      latest_token_id: seededMatch2TokenId,
      original_token_id: seededMatch2TokenId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      replaces_id: seededMatch2NotInRoles,
    },
  ])
}
