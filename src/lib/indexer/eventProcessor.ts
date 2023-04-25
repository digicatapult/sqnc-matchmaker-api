import { v4 as UUIDv4 } from 'uuid'

import { UUID } from '../../models/strings'
import { Transaction } from '../db'
import { AttachmentRecord, ChangeSet, DemandRecord, MatchRecord } from './changeSet'

const processNames = ['demand-create', 'match2-propose', 'match2-accept', 'match2-acceptFinal'] as const
type PROCESSES_TUPLE = typeof processNames
type PROCESSES = PROCESSES_TUPLE[number]

const processNameSet: Set<string> = new Set(processNames)

export const ValidateProcessName = (name: string): name is PROCESSES => processNameSet.has(name)

export type EventProcessors = {
  [key in PROCESSES]: (
    version: number,
    transaction: Transaction | null,
    inputs: { id: number; localId: UUID }[],
    outputs: { id: number; roles: Map<string, string>; metadata: Map<string, string> }[]
  ) => ChangeSet
}

const getOrError = <T>(map: Map<string, T>, key: string): T => {
  const val = map.get(key)
  if (val === undefined) {
    throw new Error(`Invalid token detected onchain. Missing prop ${key}`)
  }
  return val
}

const DefaultEventProcessors: EventProcessors = {
  'demand-create': (version, transaction, _inputs, outputs) => {
    if (version !== 1) {
      throw new Error(`Incompatible version ${version} for demand-create process`)
    }

    const newDemandId = outputs[0].id
    const newDemand = outputs[0]

    if (transaction) {
      const id = transaction.localId
      return {
        demands: new Map([
          [id, { type: 'update', id, state: 'created', latest_token_id: newDemandId, original_token_id: newDemandId }],
        ]),
      }
    }

    const attachment: AttachmentRecord = {
      type: 'insert',
      id: UUIDv4(),
      ipfs_hash: getOrError(newDemand.metadata, 'parameters'),
    }

    const demand: DemandRecord = {
      type: 'insert',
      id: UUIDv4(),
      owner: getOrError(newDemand.roles, 'owner'),
      subtype: getOrError(newDemand.metadata, 'subtype'),
      state: 'created',
      parameters_attachment_id: attachment.id,
      latest_token_id: newDemand.id,
      original_token_id: newDemand.id,
    }

    return {
      attachments: new Map([[attachment.id, attachment]]),
      demands: new Map([[demand.id, demand]]),
    }
  },
  'match2-propose': (version, transaction, inputs, outputs) => {
    if (version !== 1) {
      throw new Error(`Incompatible version ${version} for match2-propose process`)
    }

    const newDemands = [
      { id: inputs[0].localId, tokenId: outputs[0].id },
      { id: inputs[0].localId, tokenId: outputs[1].id },
    ]
    const newMatchId = outputs[2].id
    const newMatch = outputs[2]

    if (transaction) {
      const id = transaction.localId
      return {
        demands: new Map(
          newDemands.map(({ id, tokenId }) => [id, { type: 'update', id, state: 'created', latest_token_id: tokenId }])
        ),
        matches: new Map([[id, { type: 'update', id, state: 'proposed', latest_token_id: newMatchId }]]),
      }
    }

    const match: MatchRecord = {
      type: 'insert',
      id: UUIDv4(),
      optimiser: getOrError(newMatch.roles, 'Optimiser'),
      member_a: getOrError(newMatch.roles, 'MemberA'),
      member_b: getOrError(newMatch.roles, 'MemberB'),
      state: 'proposed',
      demand_a_id: getOrError(newMatch.metadata, 'demandA'),
      demand_b_id: getOrError(newMatch.metadata, 'demandB'),
      latest_token_id: newMatchId,
      original_token_id: newMatchId,
    }

    return {
      demands: new Map(
        newDemands.map(({ id, tokenId }) => [id, { type: 'update', id, state: 'created', latest_token_id: tokenId }])
      ),
      matches: new Map([[match.id, match]]),
    }
  },
  'match2-accept': () => ({}),
  'match2-acceptFinal': () => ({}),
}

export default DefaultEventProcessors
