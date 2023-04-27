import { Match2Payload, Match2Response } from '../models/match2'
import { DemandPayload } from '../models/demand'
import type { DscpPalletTraitsProcessFullyQualifiedId } from '@polkadot/types/lookup'
import type { u128, Vec } from '@polkadot/types'

import * as TokenType from '../models/tokenType'

type MetadataType = 'LITERAL' | 'FILE' | 'TOKEN_ID'

export type Metadata = Record<string, { type: MetadataType; value: number | string | MetadataFile }>

export interface Output {
  roles: Record<string, string>
  metadata: Metadata
}

export interface Payload {
  process: DscpPalletTraitsProcessFullyQualifiedId
  inputs?: Vec<u128>
  outputs: Output[]
}

export interface MetadataFile {
  blob: Blob
  filename: string
}

export const demandCreate = (demand: DemandPayload): Payload => ({
  process: { id: 'demand-create', version: 1 } as unknown as DscpPalletTraitsProcessFullyQualifiedId,
  outputs: [
    {
      roles: { Owner: demand.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' }, // TODO unable to use polkadot Metadata
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: 'created' },
        subtype: { type: 'LITERAL', value: demand.subtype },
        parameters: { type: 'FILE', value: { blob: new Blob([demand.binary_blob]), filename: demand.filename } },
      },
    },
  ],
})

export const match2Propose = (match2: Match2Response, demandA: DemandPayload, demandB: DemandPayload): Payload => ({
  process: { id: 'match2-propose', version: 1 } as unknown as DscpPalletTraitsProcessFullyQualifiedId,
  inputs: [demandA.latestTokenId, demandB.latestTokenId] as unknown as Vec<u128>,
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
  process: { id: 'match2-accept', version: 1 } as unknown as DscpPalletTraitsProcessFullyQualifiedId,
  inputs: [match2.latestTokenId] as unknown as Vec<u128>,
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
  process: { id: 'match2-acceptFinal', version: 1 } as unknown as DscpPalletTraitsProcessFullyQualifiedId,
  inputs: [demandA.latestTokenId, demandB.latestTokenId, match2.latestTokenId] as unknown as Vec<u128>,
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
