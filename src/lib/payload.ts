import basex from 'base-x'

import * as TokenType from '../models/tokenType'
import { DemandRow, DemandWithAttachmentRow, Match2Row } from './db'

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const bs58 = basex(BASE58)

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

const formatHash = (hash: string) => {
  const decoded = Buffer.from(bs58.decode(hash))
  return `0x${decoded.toString('hex').slice(4)}`
}

export const demandCreate = (demand: DemandWithAttachmentRow): Payload => ({
  process: { id: 'demand-create', version: 1 },
  inputs: [],
  outputs: [
    {
      roles: { Owner: demand.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demand.subtype },
        parameters: { type: 'FILE', value: formatHash(demand.ipfs_hash) },
      },
    },
  ],
})

export const match2Propose = (match2: Match2Row, demandA: DemandRow, demandB: DemandRow): Payload => ({
  process: { id: 'match2-propose', version: 1 },
  inputs: [demandA.latestTokenId as number, demandB.latestTokenId as number],
  outputs: [
    {
      roles: { Owner: demandA.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        originalId: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
      },
    },
    {
      roles: { Owner: demandB.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        originalId: { type: 'TOKEN_ID', value: demandB.originalTokenId as number },
      },
    },
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'proposed' },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
        demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId as number },
      },
    },
  ],
})

export const match2AcceptFirst = (
  match2: Match2Row,
  newState: 'acceptedA' | 'acceptedB',
  demandA: DemandRow,
  demandB: DemandRow
): Payload => ({
  process: { id: 'match2-accept', version: 1 },
  inputs: [match2.latestTokenId as number],
  outputs: [
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: newState },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
        demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId as number },
        originalId: { type: 'TOKEN_ID', value: match2.originalTokenId as number },
      },
    },
  ],
})

export const match2AcceptFinal = (match2: Match2Row, demandA: DemandRow, demandB: DemandRow): Payload => ({
  process: { id: 'match2-acceptFinal', version: 1 },
  inputs: [demandA.latestTokenId as number, demandB.latestTokenId as number, match2.latestTokenId as number],
  outputs: [
    {
      roles: { Owner: demandA.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'allocated' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        originalId: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
      },
    },
    {
      roles: { Owner: demandB.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'allocated' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        originalId: { type: 'TOKEN_ID', value: demandB.originalTokenId as number },
      },
    },
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'acceptedFinal' },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
        demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId as number },
        originalId: { type: 'TOKEN_ID', value: match2.originalTokenId as number },
      },
    },
  ],
})
