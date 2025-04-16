import { container } from 'tsyringe'
import Database from '../../../src/lib/db/index.js'
import { notSelfAddress, optimiserAddress, proxyAddress } from '../../helper/mock.js'
import { dbInsert } from './helper.js'
import { randomUUID } from 'node:crypto'

export const cleanup = async () => {
  const db = container.resolve(Database)
  await db.delete('demand', {})
  await db.delete('match2', {})
  await db.delete('demand_comment', {})
  await db.delete('match2_comment', {})
}

export const demandAParametersId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf8'
export const demandBParametersId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf9'
export const demandACommentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf1'
export const demandBCommentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf2'
export const demandAOwnedByNotSelfCommentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf5'
export const demandBOwnedByNotOptimiserCommentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf6'
export const demandAOwnedByNotOptimiserCommentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf0'
export const demandBOwnedByNotSelfCommentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf7'
export const match2CommentId = 'a789ad47-91c3-446e-90f9-a7c9b233eae0'
export const match2NotOwnedCommentId = 'a789ad47-91c3-446e-90f9-a7c9b233eae1'

const notSelfOwnedDemandAId = randomUUID()
const notOptimiserOwnedDemandBId = randomUUID()
const notSelfOwnedDemandBId = randomUUID()
const notOptimiserOwnedDemandAId = randomUUID()
const match2Id = randomUUID()
const match2ProxyOwnedId = randomUUID()
const proxyOwnedDemandAId = randomUUID()
const externalOwnedDemandBId = randomUUID()
const externalOwnedDemandAId = randomUUID()
const proxyOwnedDemandBId = randomUUID()

const exampleDate = '2023-01-01T00:00:00.000Z'
export const notOptimiserAddress = 'someAddress'

export const authzSeed = async () => {
  const db = container.resolve(Database)
  const insert = dbInsert(db)
  await cleanup()

  // proxy-owned demand A matched with external-owned demand B. Proxy-owned comment on own demand A
  await insert('demand', [
    {
      id: proxyOwnedDemandAId,
      owner: proxyAddress,
      subtype: 'demand_a',
      state: 'pending',
      parameters_attachment_id: demandAParametersId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
    {
      id: externalOwnedDemandBId,
      owner: notSelfAddress,
      subtype: 'demand_b',
      state: 'pending',
      parameters_attachment_id: randomUUID(),
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('demand_comment', [
    {
      id: randomUUID(),
      owner: proxyAddress,
      state: 'pending',
      demand: proxyOwnedDemandAId,
      attachment_id: demandACommentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      transaction_id: null,
    },
  ])

  await insert('match2', [
    {
      id: randomUUID(),
      state: 'pending',
      optimiser: optimiserAddress,
      member_a: proxyAddress,
      member_b: notSelfAddress,
      demand_a_id: proxyOwnedDemandAId,
      demand_b_id: externalOwnedDemandBId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
      replaces_id: null,
    },
  ])

  // external-owned demand A matched with proxy-owned demand B. Proxy-owned comment on own demand B
  await insert('demand', [
    {
      id: externalOwnedDemandAId,
      owner: notSelfAddress,
      subtype: 'demand_a',
      state: 'pending',
      parameters_attachment_id: '00000000-0000-0000-0000-000000000000',
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
    {
      id: proxyOwnedDemandBId,
      owner: proxyAddress,
      subtype: 'demand_b',
      state: 'pending',
      parameters_attachment_id: demandBParametersId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('demand_comment', [
    {
      id: randomUUID(),
      owner: proxyAddress,
      state: 'pending',
      demand: proxyOwnedDemandBId,
      attachment_id: demandBCommentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      transaction_id: null,
    },
  ])

  await insert('match2', [
    {
      id: randomUUID(),
      state: 'pending',
      optimiser: optimiserAddress,
      member_a: notSelfAddress,
      member_b: proxyAddress,
      demand_a_id: externalOwnedDemandAId,
      demand_b_id: proxyOwnedDemandBId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
      replaces_id: null,
    },
  ])

  // external-owned demand A matched with notOptimiser-owned demand B. Proxy-owned comment on both demands.
  // proxy-owned match2, proxy-owned comment on both match2s.
  await insert('demand', [
    {
      id: notSelfOwnedDemandAId,
      owner: notSelfAddress,
      subtype: 'demand_a',
      state: 'pending',
      parameters_attachment_id: randomUUID(),
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
    {
      id: notOptimiserOwnedDemandBId,
      owner: notOptimiserAddress,
      subtype: 'demand_b',
      state: 'pending',
      parameters_attachment_id: randomUUID(),
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('demand_comment', [
    {
      id: randomUUID(),
      owner: proxyAddress,
      state: 'pending',
      demand: notSelfOwnedDemandAId,
      attachment_id: demandAOwnedByNotSelfCommentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      transaction_id: null,
    },
    {
      id: randomUUID(),
      owner: proxyAddress,
      state: 'pending',
      demand: notOptimiserOwnedDemandBId,
      attachment_id: demandBOwnedByNotOptimiserCommentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      transaction_id: null,
    },
  ])

  await insert('match2', [
    {
      id: match2Id,
      state: 'pending',
      optimiser: optimiserAddress,
      member_a: notSelfAddress,
      member_b: notOptimiserAddress,
      demand_a_id: notSelfOwnedDemandAId,
      demand_b_id: notOptimiserOwnedDemandBId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
      replaces_id: null,
    },
  ])

  await insert('match2', [
    {
      id: match2ProxyOwnedId,
      state: 'pending',
      optimiser: proxyAddress, // proxy is optimiser
      member_a: notSelfAddress,
      member_b: notOptimiserAddress,
      demand_a_id: notSelfOwnedDemandAId,
      demand_b_id: notOptimiserOwnedDemandBId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
      replaces_id: null,
    },
  ])

  await insert('match2_comment', [
    {
      id: randomUUID(),
      state: 'pending',
      owner: proxyAddress,
      match2: match2Id,
      attachment_id: match2NotOwnedCommentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      transaction_id: null,
    },
  ])

  await insert('match2_comment', [
    {
      id: randomUUID(),
      state: 'pending',
      owner: proxyAddress,
      match2: match2ProxyOwnedId,
      attachment_id: match2CommentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      transaction_id: null,
    },
  ])

  // notOptimiser-owned demand A matched with external-owned demand B. Proxy-owned comment on both demands
  await insert('demand', [
    {
      id: notOptimiserOwnedDemandAId,
      owner: notOptimiserAddress,
      subtype: 'demand_a',
      state: 'pending',
      parameters_attachment_id: randomUUID(),
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
    {
      id: notSelfOwnedDemandBId,
      owner: notSelfAddress,
      subtype: 'demand_b',
      state: 'pending',
      parameters_attachment_id: randomUUID(),
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
    },
  ])

  await insert('demand_comment', [
    {
      id: randomUUID(),
      owner: proxyAddress,
      state: 'pending',
      demand: notOptimiserOwnedDemandAId,
      attachment_id: demandAOwnedByNotOptimiserCommentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      transaction_id: null,
    },
    {
      id: randomUUID(),
      owner: proxyAddress,
      state: 'pending',
      demand: notSelfOwnedDemandBId,
      attachment_id: demandBOwnedByNotSelfCommentId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      transaction_id: null,
    },
  ])

  await insert('match2', [
    {
      id: randomUUID(),
      state: 'pending',
      optimiser: optimiserAddress,
      member_a: notOptimiserAddress,
      member_b: notSelfAddress,
      demand_a_id: notOptimiserOwnedDemandAId,
      demand_b_id: notSelfOwnedDemandBId,
      created_at: new Date(exampleDate),
      updated_at: new Date(exampleDate),
      latest_token_id: null,
      original_token_id: null,
      replaces_id: null,
    },
  ])
}
