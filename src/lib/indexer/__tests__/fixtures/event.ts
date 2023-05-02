import { ProcessRanEvent } from '../../../chainNode'

export const complexEvent: ProcessRanEvent = {
  blockHash: '0x01',
  callHash: '0x02',
  inputs: [1, 2, 3],
  outputs: [4, 5, 6],
  process: {
    id: 'demand-create',
    version: 1,
  },
  sender: 'alice',
}

export const noInputsOutputs: ProcessRanEvent = {
  blockHash: '0x01',
  callHash: '0x02',
  inputs: [],
  outputs: [],
  process: {
    id: 'demand-create',
    version: 1,
  },
  sender: 'alice',
}

export const invalidProcess: ProcessRanEvent = {
  blockHash: '0x01',
  callHash: '0x02',
  inputs: [],
  outputs: [],
  process: {
    id: 'invalid',
    version: 1,
  },
  sender: 'alice',
}