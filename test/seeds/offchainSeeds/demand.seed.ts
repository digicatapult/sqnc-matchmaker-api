import { container } from 'tsyringe'
import Database from '../../../src/lib/db/index.js'
import { notSelfAddress, proxyAddress, selfAddress } from '../../helper/mock.js'

export const cleanup = async () => {
  const db = container.resolve(Database).db()
  await db.attachment().del()
  await db.demand().del()
  await db.transaction().del()
  await db.demand_comment().del()
}

export const transactionHash = '0000000000000000000000000000000000000000000000000000000000000000'
export const parametersAttachmentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf8'
export const exampleDate = '2023-01-01T00:00:00.000Z'

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
export const seededDemandBAlreadyAllocated = '859a1561-a22d-4b09-925e-54ee9f9324cc'
export const seededDemandAAlreadyAllocated = '807d1184-9670-4fb0-bb33-28582e5467b1'

export const nonExistentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf9'
export const seededDemandAWithTokenId = '64d89075-0059-4a8a-87da-c6715d64d0a9'
export const seededDemandAMissingTokenId = '76b7c704-f9a0-4a80-9554-7268df097798'
export const seededDemandBMissingTokenId = 'b2348deb-d967-4317-8637-2867ced70356'

const seededDemandBWithTokenId = 'b005f4a1-400e-410e-aa72-8e97385f63e6'
const seededDemandANotOwnedId = 'c88908aa-a2a6-48df-a698-572aa30159c0'
const seededDemandBNotOwnedId = 'b21f865e-f4e9-4ae2-8944-de691e9eb4d9'
const seededDemandTokenId = 42

export const demandSeed = async () => {
  const db = container.resolve(Database).db()
  await cleanup()

  await db.attachment().insert([
    {
      id: parametersAttachmentId,
      filename: 'test.txt',
      ipfs_hash: 'QmXVStDC6kTpVHY1shgBQmyA4SuSrYnNRnHSak5iB6Eehn',
      size: 42,
      created_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandBId,
      owner: proxyAddress,
      subtype: 'demand_b',
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.transaction().insert([
    {
      id: seededDemandBCreationTransactionId,
      api_type: 'demand_b',
      transaction_type: 'creation',
      local_id: seededDemandBId,
      state: 'submitted',
      created_at: exampleDate,
      updated_at: exampleDate,
      hash: transactionHash,
    },
  ])

  await db.transaction().insert([
    {
      id: seededDemandBCreationTransactionId2,
      api_type: 'demand_b',
      transaction_type: 'creation',
      local_id: seededDemandBId,
      state: 'submitted',
      created_at: exampleDate,
      updated_at: exampleDate,
      hash: transactionHash,
    },
  ])

  await db.transaction().insert([
    {
      id: seededDemandBCommentTransactionId,
      api_type: 'demand_b',
      transaction_type: 'comment',
      local_id: seededDemandBId,
      state: 'submitted',
      created_at: exampleDate,
      updated_at: exampleDate,
      hash: transactionHash,
    },
    {
      id: seededDemandBCommentTransactionId2,
      api_type: 'demand_b',
      transaction_type: 'comment',
      local_id: seededDemandBId,
      state: 'submitted',
      created_at: exampleDate,
      updated_at: exampleDate,
      hash: transactionHash,
    },
  ])

  await db.demand_comment().insert([
    {
      id: seededDemandBCommentTransactionId,
      owner: proxyAddress,
      state: 'pending',
      demand: seededDemandBId,
      attachment: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
    {
      id: seededDemandBCommentTransactionId2,
      owner: proxyAddress,
      state: 'created',
      demand: seededDemandBId,
      attachment: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandAId,
      owner: proxyAddress,
      subtype: 'demand_a',
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.transaction().insert([
    {
      id: seededDemandACreationTransactionId,
      api_type: 'demand_a',
      transaction_type: 'creation',
      local_id: seededDemandAId,
      state: 'submitted',
      created_at: exampleDate,
      updated_at: exampleDate,
      hash: transactionHash,
    },
  ])

  await db.transaction().insert([
    {
      id: seededDemandACreationTransactionId2,
      api_type: 'demand_a',
      transaction_type: 'creation',
      local_id: seededDemandAId,
      state: 'submitted',
      created_at: exampleDate,
      updated_at: exampleDate,
      hash: transactionHash,
    },
  ])

  await db.transaction().insert([
    {
      id: seededDemandACommentTransactionId,
      api_type: 'demand_a',
      transaction_type: 'comment',
      local_id: seededDemandAId,
      state: 'submitted',
      created_at: exampleDate,
      updated_at: exampleDate,
      hash: transactionHash,
    },
    {
      id: seededDemandACommentTransactionId2,
      api_type: 'demand_a',
      transaction_type: 'comment',
      local_id: seededDemandAId,
      state: 'submitted',
      created_at: exampleDate,
      updated_at: exampleDate,
      hash: transactionHash,
    },
  ])

  await db.demand_comment().insert([
    {
      id: seededDemandACommentTransactionId,
      owner: proxyAddress,
      state: 'pending',
      demand: seededDemandAId,
      attachment: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
    {
      id: seededDemandACommentTransactionId2,
      owner: proxyAddress,
      state: 'created',
      demand: seededDemandAId,
      attachment: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandANotOwnedId,
      owner: notSelfAddress,
      subtype: 'demand_a',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandBNotOwnedId,
      owner: notSelfAddress,
      subtype: 'demand_b',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandBMissingTokenId,
      owner: proxyAddress,
      subtype: 'demand_b',
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandAMissingTokenId,
      owner: selfAddress,
      subtype: 'demand_a',
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandBWithTokenId,
      owner: selfAddress,
      subtype: 'demand_b',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandAWithTokenId,
      owner: selfAddress,
      subtype: 'demand_a',
      state: 'created',
      parameters_attachment_id: parametersAttachmentId,
      latest_token_id: seededDemandTokenId,
      original_token_id: seededDemandTokenId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandBAlreadyAllocated,
      owner: selfAddress,
      subtype: 'demand_b',
      state: 'allocated',
      parameters_attachment_id: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])

  await db.demand().insert([
    {
      id: seededDemandAAlreadyAllocated,
      owner: selfAddress,
      subtype: 'demand_a',
      state: 'allocated',
      parameters_attachment_id: parametersAttachmentId,
      created_at: exampleDate,
      updated_at: exampleDate,
    },
  ])
}
