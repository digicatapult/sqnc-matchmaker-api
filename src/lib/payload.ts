import { Match2Payload, Match2Response, Match2State } from '../models/match2'
import { DemandPayload, DemandState } from '../models/demand'
import { TokenType } from '../models/tokenType'

export const demandCreate = (demand: DemandPayload) => ({
  files: [{ blob: new Blob([demand.binary_blob]), filename: demand.filename }],
  process: { id: 'demand-create', version: 1 },
  inputs: [],
  outputs: [
    {
      roles: { Owner: demand.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: DemandState.created },
        subtype: { type: 'LITERAL', value: demand.subtype },
        parameters: { type: 'FILE', value: demand.filename },
      },
    },
  ],
})

export const match2Propose = (match2: Match2Response, demandA: DemandPayload, demandB: DemandPayload) => ({
  files: [],
  process: { id: 'match2-propose', version: 1 },
  inputs: [demandA.latestTokenId, demandB.latestTokenId],
  outputs: [
    {
      roles: { Owner: demandA.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: DemandState.created },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        originalId: { type: 'TOKEN_ID', value: demandA.originalTokenId },
      },
    },
    {
      roles: { Owner: demandB.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: DemandState.created },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        originalId: { type: 'TOKEN_ID', value: demandB.originalTokenId },
      },
    },
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: Match2State.proposed },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId },
        demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId },
      },
    },
  ],
})

export const match2FirstAccept = (
  match2: Match2Payload,
  newState: Match2State.acceptedA | Match2State.acceptedB,
  demandA: DemandPayload,
  demandB: DemandPayload
) => ({
  files: [],
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

export const match2FinalAccept = (match2: Match2Payload, demandA: DemandPayload, demandB: DemandPayload) => ({
  files: [],
  process: { id: 'match2-acceptFinal', version: 1 },
  inputs: [demandA.latestTokenId, demandB.latestTokenId, match2.latestTokenId],
  outputs: [
    {
      roles: { Owner: demandA.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: DemandState.allocated },
        subtype: { type: 'LITERAL', value: demandA.subtype },
        originalId: { type: 'TOKEN_ID', value: demandA.originalTokenId },
      },
    },
    {
      roles: { Owner: demandB.owner },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.DEMAND },
        state: { type: 'LITERAL', value: DemandState.allocated },
        subtype: { type: 'LITERAL', value: demandB.subtype },
        originalId: { type: 'TOKEN_ID', value: demandB.originalTokenId },
      },
    },
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: Match2State.acceptedFinal },
        demandA: { type: 'TOKEN_ID', value: demandA.originalTokenId },
        demandB: { type: 'TOKEN_ID', value: demandB.originalTokenId },
        originalId: { type: 'TOKEN_ID', value: match2.originalTokenId },
      },
    },
  ],
})
