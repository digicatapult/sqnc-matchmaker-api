import { container } from 'tsyringe'
import env from '../../../src/env.js'
import Database from '../../../src/lib/db/index.js'
import { parametersAttachmentId, proxyAddress, selfAddress, notSelfAddress } from '../../helper/mock.js'
import { dbInsert } from './helper.js'

export const cleanup = async () => {
  const db = container.resolve(Database)
  await db.delete('demand', {})
  await db.delete('transaction', {})
  await db.delete('match2', {})
  await db.delete('demand_comment', {})
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
export const seededDemandANotOwnedId = 'f8a2b0c1-4d3e-4a5f-8bs7c-6d9e5f3a0b2c'

export const seededMatch2Id = 'f960e4a1-6182-4dd3-8ac2-6f3fad995551'
export const exampleDate = '2023-01-01T00:00:00.000Z'
export const seededDemandAWithTokenId = '64d89075-0059-4a8a-87da-c6715d64d0a9'

export const nonExistentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf9'
export const seededDemandBMissingTokenId = 'b2348deb-d967-4317-8637-2867ced70356'
export const seededDemandAMissingTokenId = '76b7c704-f9a0-4a80-9554-7268df097798'
export const seededDemandBAlreadyAllocated = '859a1561-a22d-4b09-925e-54ee9f9324cc'
export const seededDemandAAlreadyAllocated = '807d1184-9670-4fb0-bb33-28582e5467b1'
export const seededMatch2WithAllocatedDemands = '27965a5f-f3dd-4110-82e7-68f59bb02c2e'
export const seededMatch2AcceptedA = '347411d3-3750-49dd-a548-88e9f2616d9c'
export const seededMatch2AcceptedFinal = '85a50fd9-f20f-4a61-a7e4-3ad49b7c3f21'
export const seededMatch2NotAcceptableA = '46d7dbe8-aaef-472e-af9f-ecdd2681d3a5'
export const seededMatch2NotAcceptableB = '097d3905-72aa-4517-85d2-0091d26fceac'
export const seededMatch2NotAcceptableBoth = '619fb8ca-4dd9-4843-8c7a-9d9c9474784d'
export const seededMatch2NotInRoles = '619fb8ca-4dd9-4843-8c7a-9d9c9474784e'

export const seed = async () => {
  const db = container.resolve(Database)
  const insert = dbInsert(db)
  await cleanup()

  await insert('demand', [
    {
      id: seededDemandAId,
      owner: env.PROXY_FOR === '' ? selfAddress : proxyAddress,
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
      state: 'pending',
      parameters_attachment_id: parametersAttachmentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])
}
