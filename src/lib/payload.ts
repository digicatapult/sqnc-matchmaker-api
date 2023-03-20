import { Demand, DemandState } from '../models/demand'
import { TokenType } from '../models/tokenType'
import { UUID } from '../models/uuid'

export const demandCreate = (demand: Demand, transactionId: UUID) => ({
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
