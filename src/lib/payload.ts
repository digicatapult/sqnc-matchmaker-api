import { Match2Response, Match2State } from 'src/models'
import { DemandPayload, DemandResponse, DemandState } from '../models/demand'
import { TokenType } from '../models/tokenType'
import { UUID } from '../models/uuid'

export const demandCreate = (demand: DemandPayload, transactionId: UUID) => ({
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
        transactionId: { type: 'LITERAL', value: transactionId.replace(/[-]/g, '') },
      },
    },
  ],
})

export const match2Propose = (
  match2: Match2Response,
  demandA: DemandResponse,
  demandB: DemandResponse,
  transactionId: UUID
) => ({
  process: { id: 'match2-propose', version: 1 },
  inputs: [],
  outputs: [
    {
      roles: { Optimiser: match2.optimiser, MemberA: match2.memberA, MemberB: match2.memberB },
      metadata: {
        version: { type: 'LITERAL', value: '1' },
        type: { type: 'LITERAL', value: TokenType.MATCH2 },
        state: { type: 'LITERAL', value: Match2State.proposed },
        demandA: { type: 'TOKEN_ID', value: Match2State.proposed },
        demandB: { type: 'TOKEN_ID', value: Match2State.proposed },
        transactionId: { type: 'LITERAL', value: transactionId.replace(/[-]/g, '') },
      },
    },
  ],
})
