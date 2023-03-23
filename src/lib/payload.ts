import { Match2Response, Match2State } from '../models/match2'
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

export const match2Propose = (match2: Match2Response, demandAId: number, demandBId: number) => ({
  files: [],
  process: { id: 'match2-propose', version: 1 },
  inputs: [demandAId, demandBId],
  outputs: [
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: Match2State.proposed },
        demandA: { type: 'TOKEN_ID', value: demandAId },
        demandB: { type: 'TOKEN_ID', value: demandBId },
      },
    },
  ],
})
