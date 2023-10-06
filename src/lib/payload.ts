import * as TokenType from '../models/tokenType'
import { AttachmentRow, DemandRow, DemandWithAttachmentRow, Match2Row } from './db'
import { bs58ToHex } from '../utils/hex'

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
        parameters: { type: 'FILE', value: bs58ToHex(demand.ipfs_hash) },
      },
    },
  ],
})

export const demandCommentCreate = (demand: DemandRow, comment: AttachmentRow): Payload => ({
  process: { id: 'demand-comment', version: 1 },
  inputs: [demand.latestTokenId as number],
  outputs: [
    {
      roles: { Owner: demand.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: demand.state },
        subtype: { type: 'LITERAL', value: demand.subtype },
        comment: { type: 'FILE', value: bs58ToHex(comment.ipfsHash) },
        originalId: { type: 'TOKEN_ID', value: demand.originalTokenId as number },
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
  process: { id: 'rematch2-propose', version: 1 },
  inputs: [
    demandA.latestTokenId as number,
    originalMatch2.match2.latestTokenId as number,
    demandB.latestTokenId as number,
  ],
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
      roles: {
        Optimiser: originalMatch2.match2.optimiser,
        MemberA: originalMatch2.match2.memberA,
        MemberB: originalMatch2.match2.memberB,
      },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'acceptedFinal' },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
        demandB: { type: 'TOKEN_ID', value: originalMatch2.demandB.originalTokenId as number },
        originalId: { type: 'TOKEN_ID', value: originalMatch2.match2.originalTokenId as number },
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
        replaces: { type: 'TOKEN_ID', value: originalMatch2.match2.originalTokenId as number },
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

export const match2Cancel = (
  match2: Match2Row,
  demandA: DemandRow,
  demandB: DemandRow,
  comment: AttachmentRow
): Payload => ({
  process: { id: 'match2-cancel', version: 1 },
  inputs: [demandA.latestTokenId as number, demandB.latestTokenId as number, match2.latestTokenId as number],
  outputs: [
    {
      roles: { Owner: demandA.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'cancelled' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        originalId: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
      },
    },
    {
      roles: { Owner: demandB.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'cancelled' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        originalId: { type: 'TOKEN_ID', value: demandB.originalTokenId as number },
      },
    },
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'cancelled' },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
        demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId as number },
        originalId: { type: 'TOKEN_ID', value: match2.originalTokenId as number },
        comment: { type: 'FILE', value: bs58ToHex(comment.ipfsHash) },
      },
    },
  ],
})

export const match2Reject = (match2: Match2Row): Payload => ({
  process: { id: 'match2-reject', version: 1 },
  inputs: [match2.latestTokenId as number],
  outputs: [],
})

type Rematch2AcceptFinalArgs = {
  match2: Match2Row
  demandA: DemandRow
  demandB: DemandRow
  newDemandB: DemandRow
  newMatch2: Match2Row
}
// due to the number of args turning into an object so order is mandatory
export const rematch2AcceptFinal = ({
  match2,
  demandA,
  demandB,
  newDemandB,
  newMatch2,
}: Rematch2AcceptFinalArgs): Payload => {
  const rows: Array<Match2Row | DemandRow> = [demandA, demandB, match2, newDemandB, newMatch2]

  return {
    process: { id: 'rematch2-acceptFinal', version: 1 },
    inputs: rows.map(({ latestTokenId }) => latestTokenId) as number[],
    outputs: [
      {
        roles: { Owner: demandA.owner },
        metadata: {
          version: { type: 'LITERAL', value: '1' },
          type: { type: 'LITERAL', value: TokenType.DEMAND },
          state: { type: 'LITERAL', value: 'cancelled' },
          subtype: { type: 'LITERAL', value: demandA.subtype },
          originalId: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
        },
      },
      {
        roles: { Owner: demandB.owner },
        metadata: {
          version: { type: 'LITERAL', value: '1' },
          type: { type: 'LITERAL', value: TokenType.DEMAND },
          state: { type: 'LITERAL', value: 'cancelled' },
          subtype: { type: 'LITERAL', value: demandB.subtype },
          originalId: { type: 'TOKEN_ID', value: demandB.originalTokenId as number },
        },
      },
      {
        roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
        metadata: {
          version: { type: 'LITERAL', value: '1' },
          type: { type: 'LITERAL', value: TokenType.MATCH2 },
          state: { type: 'LITERAL', value: 'cancelled' },
          demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
          demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId as number },
          originalId: { type: 'TOKEN_ID', value: match2.originalTokenId as number },
        },
      },
      {
        roles: { Owner: newDemandB.owner },
        metadata: {
          version: { type: 'LITERAL', value: '1' },
          type: { type: 'LITERAL', value: TokenType.DEMAND },
          state: { type: 'LITERAL', value: 'allocated' },
          subtype: { type: 'LITERAL', value: newDemandB.subtype },
          originalId: { type: 'TOKEN_ID', value: newDemandB.originalTokenId as number },
        },
      },
      {
        roles: { Optimiser: newMatch2.optimiser, MemberA: newMatch2.memberA, MemberB: newMatch2.memberB },
        metadata: {
          version: { type: 'LITERAL', value: '1' },
          type: { type: 'LITERAL', value: TokenType.MATCH2 },
          state: { type: 'LITERAL', value: 'acceptedFinal' },
          demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId as number },
          demandB: { type: 'TOKEN_ID', value: newDemandB.originalTokenId as number },
          originalId: { type: 'TOKEN_ID', value: newMatch2.originalTokenId as number },
        },
      },
    ],
  }
}
