import { v4 as UUIDv4 } from 'uuid'

import { UUID } from '../../models/strings'
import { Transaction } from '../db'
import { AttachmentRecord, ChangeSet, DemandCommentRecord, DemandRecord, MatchRecord } from './changeSet'

const processNames = [
  'demand-create',
  'match2-propose',
  'match2-accept',
  'match2-acceptFinal',
  'demand-comment',
  'match2-reject',
] as const
type PROCESSES_TUPLE = typeof processNames
type PROCESSES = PROCESSES_TUPLE[number]

const processNameSet: Set<string> = new Set(processNames)

export const ValidateProcessName = (name: string): name is PROCESSES => processNameSet.has(name)

export type EventProcessors = {
  [key in PROCESSES]: (
    version: number,
    transaction: Transaction | null,
    sender: string,
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
  'demand-create': (version, transaction, _sender, _inputs, outputs) => {
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
  'demand-comment': (version, transaction, sender, inputs, outputs) => {
    if (version !== 1) {
      throw new Error(`Incompatible version ${version} for match2-propose process`)
    }

    const newDemand = outputs[0]
    const demandId = inputs[0].localId

    const demandUpdate: DemandRecord = {
      type: 'update',
      id: demandId,
      state: getOrError(newDemand.metadata, 'state'),
      latest_token_id: newDemand.id,
    }

    if (transaction) {
      return {
        demandComments: new Map([
          [
            transaction.id,
            {
              type: 'update',
              transaction_id: transaction.id,
              state: 'created',
            },
          ],
        ]),
        demands: new Map([[demandId, demandUpdate]]),
      }
    }

    const attachment: AttachmentRecord = {
      type: 'insert',
      id: UUIDv4(),
      ipfs_hash: getOrError(newDemand.metadata, 'comment'),
    }

    const comment: DemandCommentRecord = {
      type: 'insert',
      id: UUIDv4(),
      state: 'created',
      demand: demandId,
      owner: sender,
      attachment: attachment.id,
    }

    return {
      attachments: new Map([[attachment.id, attachment]]),
      demandComments: new Map([[comment.id, comment]]),
      demands: new Map([[demandId, demandUpdate]]),
    }
  },
  
  'match2-propose': (version, transaction, _sender, inputs, outputs) => {
    if (version !== 1) {
      throw new Error(`Incompatible version ${version} for match2-propose process`)
    }

    const newDemands = [
      { id: inputs[0].localId, tokenId: outputs[0].id },
      { id: inputs[1].localId, tokenId: outputs[1].id },
    ]
    const newMatchId = outputs[2].id
    const newMatch = outputs[2]

    if (transaction) {
      const id = transaction.localId
      return {
        demands: new Map(
          newDemands.map(({ id, tokenId }) => [id, { type: 'update', id, state: 'created', latest_token_id: tokenId }])
        ),
        matches: new Map([
          [id, { type: 'update', id, state: 'proposed', latest_token_id: newMatchId, original_token_id: newMatchId }],
        ]),
      }
    }

    const match: MatchRecord = {
      type: 'insert',
      id: UUIDv4(),
      optimiser: getOrError(newMatch.roles, 'optimiser'),
      member_a: getOrError(newMatch.roles, 'membera'),
      member_b: getOrError(newMatch.roles, 'memberb'),
      state: 'proposed',
      demand_a_id: inputs[0].localId,
      demand_b_id: inputs[1].localId,
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
  'match2-accept': (version, _transaction, _sender, inputs, outputs) => {
    if (version !== 1) {
      throw new Error(`Incompatible version ${version} for match2-accept process`)
    }

    const localId = inputs[0].localId
    const match = outputs[0]

    return {
      matches: new Map([
        [
          localId,
          {
            id: localId,
            type: 'update',
            latest_token_id: match.id,
            state: getOrError(match.metadata, 'state'),
          },
        ],
      ]),
    }
  },
  'match2-acceptFinal': (version, _transaction, _sender, inputs, outputs) => {
    if (version !== 1) {
      throw new Error(`Incompatible version ${version} for match2-acceptFinal process`)
    }

    const demandALocalId = inputs[0].localId
    const demandAId = outputs[0].id
    const demandBLocalId = inputs[1].localId
    const demandBId = outputs[1].id
    const matchLocalId = inputs[2].localId
    const matchId = outputs[2].id

    return {
      demands: new Map([
        [demandALocalId, { type: 'update', id: demandALocalId, latest_token_id: demandAId, state: 'allocated' }],
        [demandBLocalId, { type: 'update', id: demandBLocalId, latest_token_id: demandBId, state: 'allocated' }],
      ]),
      matches: new Map([
        [matchLocalId, { type: 'update', id: matchLocalId, latest_token_id: matchId, state: 'acceptedFinal' }],
      ]),
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  'match2-reject': (version, _transaction, _sender, inputs, _outputs) => {
    if (version !== 1) {
      throw new Error(`Incompatible version ${version} for match2-reject process`)
    }

    const localId = inputs[0].localId

    return {
      matches: new Map([
        [
          localId,
          {
            id: localId,
            type: 'update',
            state: 'rejected',
          },
        ],
      ]),
    }
  },
}

export default DefaultEventProcessors
