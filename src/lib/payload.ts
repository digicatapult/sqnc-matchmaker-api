import * as TokenType from '../models/tokenType.js'
import { DemandRow, Match2Row } from './db/types.js'
import { bs58ToHex } from '../utils/hex.js'
import { AttachmentEntry } from './services/attachment.js'

export interface Payload {
  process: { id: string; version: number }
  inputs: number[]
  outputs: Output[]
}

export interface Output {
  roles: Record<string, string>
  metadata: Metadata
}

export interface MetadataFile {
  blob: Blob
  filename: string
}

export type Metadata = Record<string, { type: string; value: string | number }>

export const demandCreate = (demand: DemandRow, attachment: AttachmentEntry): Payload => ({
  process: { id: 'demand_create', version: 1 },
  inputs: [],
  outputs: [
    {
      roles: { owner: demand.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demand.subtype },
        parameters: { type: 'FILE', value: bs58ToHex(attachment.integrityHash) },
      },
    },
  ],
})

export const demandCommentCreate = (demand: DemandRow, comment: AttachmentEntry): Payload => ({
  process: { id: 'demand_comment', version: 1 },
  inputs: [demand.latest_token_id as number],
  outputs: [
    {
      roles: { owner: demand.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: demand.state },
        subtype: { type: 'LITERAL', value: demand.subtype },
        comment: { type: 'FILE', value: bs58ToHex(comment.integrityHash) },
        '@original_id': { type: 'TOKEN_ID', value: demand.original_token_id as number },
      },
    },
  ],
})

export const rematch2Propose = (
  match2: Match2Row,
  demandA: DemandRow,
  originalMatch2: { match2: Match2Row; demandB: DemandRow },
  demandB: DemandRow
): Payload => ({
  process: { id: 'rematch2_propose', version: 1 },
  inputs: [
    demandA.latest_token_id as number,
    originalMatch2.match2.latest_token_id as number,
    demandB.latest_token_id as number,
  ],
  outputs: [
    {
      roles: { owner: demandA.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'allocated' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandA.original_token_id as number },
      },
    },
    {
      roles: {
        optimiser: originalMatch2.match2.optimiser,
        member_a: originalMatch2.match2.member_a,
        member_b: originalMatch2.match2.member_b,
      },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'acceptedFinal' },
        demand_a: { type: 'TOKEN_ID', value: demandA.original_token_id as number },
        demand_b: { type: 'TOKEN_ID', value: originalMatch2.demandB.original_token_id as number },
        '@original_id': { type: 'TOKEN_ID', value: originalMatch2.match2.original_token_id as number },
      },
    },
    {
      roles: { owner: demandB.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandB.original_token_id as number },
      },
    },
    {
      roles: { optimiser: match2.optimiser, member_a: match2.member_a, member_b: match2.member_b },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'proposed' },
        demand_a: { type: 'TOKEN_ID', value: demandA.original_token_id as number },
        demand_b: { type: 'TOKEN_ID', value: demandB.original_token_id as number },
        replaces: { type: 'TOKEN_ID', value: originalMatch2.match2.original_token_id as number },
      },
    },
  ],
})

export const match2Propose = (match2: Match2Row, demandA: DemandRow, demandB: DemandRow): Payload => ({
  process: { id: 'match2_propose', version: 1 },
  inputs: [demandA.latest_token_id as number, demandB.latest_token_id as number],
  outputs: [
    {
      roles: { owner: demandA.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandA.original_token_id as number },
      },
    },
    {
      roles: { owner: demandB.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandB.original_token_id as number },
      },
    },
    {
      roles: { optimiser: match2.optimiser, member_a: match2.member_a, member_b: match2.member_b },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'proposed' },
        demand_a: { type: 'TOKEN_ID', value: demandA.original_token_id as number },
        demand_b: { type: 'TOKEN_ID', value: demandB.original_token_id as number },
      },
    },
  ],
})

export const match2AcceptFirst = (
  match2: Match2Row,
  newState: 'acceptedA' | 'acceptedB',
  demandA: DemandRow,
  demandB: DemandRow,
  replaces?: number | null
): Payload => ({
  process: { id: 'match2_accept', version: 1 },
  inputs: [match2.latest_token_id as number],
  outputs: [
    {
      roles: { optimiser: match2.optimiser, member_a: match2.member_a, member_b: match2.member_b },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: newState },
        demand_a: { type: 'TOKEN_ID', value: demandA.original_token_id as number },
        demand_b: { type: 'TOKEN_ID', value: demandB.original_token_id as number },
        '@original_id': { type: 'TOKEN_ID', value: match2.original_token_id as number },
        ...(replaces ? { replaces: { type: 'TOKEN_ID', value: replaces } } : {}),
      },
    },
  ],
})

export const match2AcceptFinal = (match2: Match2Row, demandA: DemandRow, demandB: DemandRow): Payload => ({
  process: { id: 'match2_acceptFinal', version: 1 },
  inputs: [demandA.latest_token_id as number, demandB.latest_token_id as number, match2.latest_token_id as number],
  outputs: [
    {
      roles: { owner: demandA.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'allocated' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandA.original_token_id as number },
      },
    },
    {
      roles: { owner: demandB.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'allocated' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandB.original_token_id as number },
      },
    },
    {
      roles: { optimiser: match2.optimiser, member_a: match2.member_a, member_b: match2.member_b },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'acceptedFinal' },
        demand_a: { type: 'TOKEN_ID', value: demandA.original_token_id as number },
        demand_b: { type: 'TOKEN_ID', value: demandB.original_token_id as number },
        '@original_id': { type: 'TOKEN_ID', value: match2.original_token_id as number },
      },
    },
  ],
})

export const match2Cancel = (
  match2: Match2Row,
  demandA: DemandRow,
  demandB: DemandRow,
  comment: AttachmentEntry
): Payload => ({
  process: { id: 'match2_cancel', version: 1 },
  inputs: [demandA.latest_token_id as number, demandB.latest_token_id as number, match2.latest_token_id as number],
  outputs: [
    {
      roles: { owner: demandA.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'cancelled' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandA.original_token_id as number },
      },
    },
    {
      roles: { owner: demandB.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'cancelled' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandB.original_token_id as number },
      },
    },
    {
      roles: { optimiser: match2.optimiser, member_a: match2.member_a, member_b: match2.member_b },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'cancelled' },
        demand_a: { type: 'TOKEN_ID', value: demandA.original_token_id as number },
        demand_b: { type: 'TOKEN_ID', value: demandB.original_token_id as number },
        '@original_id': { type: 'TOKEN_ID', value: match2.original_token_id as number },
        comment: { type: 'FILE', value: bs58ToHex(comment.integrityHash) },
      },
    },
  ],
})

export const match2Reject = (match2: Match2Row): Payload => ({
  process: { id: 'match2_reject', version: 1 },
  inputs: [match2.latest_token_id as number],
  outputs: [],
})

type Rematch2AcceptFinal = {
  match2: Match2Row
  demandA: DemandRow
  demandB: DemandRow
  oldDemandB: DemandRow
  oldMatch2: Match2Row
}

// due to the number of args turning into an object so order is mandatory
export const rematch2AcceptFinal = ({
  demandA,
  oldDemandB,
  oldMatch2,
  demandB,
  match2,
}: Rematch2AcceptFinal): Payload => ({
  process: { id: 'rematch2_acceptFinal', version: 1 },
  inputs: [
    demandA.latest_token_id,
    oldDemandB.latest_token_id,
    oldMatch2.latest_token_id,
    demandB.latest_token_id,
    match2.latest_token_id,
  ] as number[],
  outputs: [
    {
      roles: { owner: demandA.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'allocated' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandA.original_token_id as number },
      },
    },
    {
      roles: { owner: oldDemandB.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'cancelled' },
        subtype: { type: 'LITERAL', value: oldDemandB.subtype },
        '@original_id': { type: 'TOKEN_ID', value: oldDemandB.original_token_id as number },
      },
    },
    {
      roles: { optimiser: oldMatch2.optimiser, member_a: oldMatch2.member_a, member_b: oldMatch2.member_b },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'cancelled' },
        demand_a: { type: 'TOKEN_ID', value: demandA.original_token_id as number },
        demand_b: { type: 'TOKEN_ID', value: oldDemandB.original_token_id as number },
        '@original_id': { type: 'TOKEN_ID', value: oldMatch2.original_token_id as number },
      },
    },
    {
      roles: { owner: demandB.owner },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'allocated' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        '@original_id': { type: 'TOKEN_ID', value: demandB.original_token_id as number },
      },
    },
    {
      roles: { optimiser: match2.optimiser, member_a: match2.member_a, member_b: match2.member_b },
      metadata: {
        '@version': { type: 'LITERAL', value: '1' },
        '@type': { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'acceptedFinal' },
        demand_a: { type: 'TOKEN_ID', value: demandA.original_token_id as number },
        demand_b: { type: 'TOKEN_ID', value: demandB.original_token_id as number },
        '@original_id': { type: 'TOKEN_ID', value: match2.original_token_id as number },
        replaces: { type: 'TOKEN_ID', value: oldMatch2.original_token_id as number },
      },
    },
  ],
})
