import { Match2Payload, Match2Response } from '../models/match2'
import { DemandPayload } from '../models/demand'
import * as TokenType from '../models/tokenType'

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

export type Metadata = Record<string, { type: string; value: string | MetadataFile | number }>

export const demandCreate = (demand: DemandPayload): Payload => ({
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
        parameters: { type: 'FILE', value: { blob: new Blob([demand.binary_blob]), filename: demand.filename } },
      },
    },
  ],
})

export const match2Propose = (match2: Match2Response, demandA: DemandPayload, demandB: DemandPayload): Payload => ({
  process: { id: 'match2-propose', version: 1 },
  inputs: [demandA.latestTokenId, demandB.latestTokenId],
  outputs: [
    {
      roles: { Owner: demandA.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        originalId: { type: 'TOKEN_ID', value: demandA.originalTokenId },
      },
    },
    {
      roles: { Owner: demandB.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        originalId: { type: 'TOKEN_ID', value: demandB.originalTokenId },
      },
    },
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'proposed' },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId },
        demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId },
      },
    },
  ],
})

export const match2AcceptFirst = (
  match2: Match2Payload,
  newState: 'acceptedA' | 'acceptedB',
  demandA: DemandPayload,
  demandB: DemandPayload
): Payload => ({
  process: { id: 'match2-accept', version: 1 },
  inputs: [match2.latestTokenId],
  outputs: [
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: newState },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId },
        demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId },
        originalId: { type: 'TOKEN_ID', value: match2.originalTokenId },
      },
    },
  ],
})

export const match2AcceptFinal = (match2: Match2Payload, demandA: DemandPayload, demandB: DemandPayload): Payload => ({
  process: { id: 'match2-acceptFinal', version: 1 },
  inputs: [demandA.latestTokenId, demandB.latestTokenId, match2.latestTokenId],
  outputs: [
    {
      roles: { Owner: demandA.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'allocated' },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        originalId: { type: 'TOKEN_ID', value: demandA.originalTokenId },
      },
    },
    {
      roles: { Owner: demandB.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'allocated' },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        originalId: { type: 'TOKEN_ID', value: demandB.originalTokenId },
      },
    },
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: 'acceptedFinal' },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId },
        demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId },
        originalId: { type: 'TOKEN_ID', value: match2.originalTokenId },
      },
    },
  ],
})
