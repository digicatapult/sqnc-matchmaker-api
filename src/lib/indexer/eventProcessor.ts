import { v4 as UUIDv4 } from 'uuid'

import type { UUID } from '../../models/strings.js'
import type { TransactionRow } from '../db/types.js'
import { demandStateParser, demandSubtypeParser, match2StateParser } from '../db/types.js'
import type {
  AttachmentRecord,
  ChangeSet,
  DemandCommentRecord,
  DemandRecord,
  Match2CommentRecord,
  MatchRecord,
} from './changeSet.js'

const processNames = [
  'demand_create',
  'match2_propose',
  'match2_accept',
  'match2_acceptFinal',
  'demand_comment',
  'match2_reject',
  'rematch2_propose',
  'rematch2_acceptFinal',
  'match2_cancel',
] as const
type PROCESSES_TUPLE = typeof processNames
type PROCESSES = PROCESSES_TUPLE[number]

const processNameSet: Set<string> = new Set(processNames)

export const ValidateProcessName = (name: string): name is PROCESSES => processNameSet.has(name)

export type EventProcessors = {
  [key in PROCESSES]: (
    version: number,
    transaction: TransactionRow | null,
    sender: string,
    inputs: { id: number; localId: UUID }[],
    outputs: { id: number; roles: Map<string, string>; metadata: Map<string, string> }[]
  ) => ChangeSet
}

const getOrError = <T>(map: Map<string, T>, key: string) => {
  const val = map.get(key)
  if (val === undefined) {
    throw new Error(`Invalid token detected onchain. Missing prop ${key}`)
  }
  return val
}

const attachmentPayload = (map: Map<string, string>, sender: string, key: string): AttachmentRecord => ({
  type: 'insert',
  id: UUIDv4(),
  integrityHash: getOrError(map, key),
  ownerAddress: sender,
})

const DefaultEventProcessors: EventProcessors = {
  demand_create: (version, transaction, sender, _inputs, outputs) => {
    if (version !== 1) throw new Error(`Incompatible version ${version} for demand_create process`)

    const newDemandId = outputs[0].id
    const newDemand = outputs[0]

    if (transaction) {
      const id = transaction.local_id
      return {
        demands: new Map([
          [id, { type: 'update', id, state: 'created', latest_token_id: newDemandId, original_token_id: newDemandId }],
        ]),
      }
    }

    const attachment: AttachmentRecord = attachmentPayload(newDemand.metadata, sender, 'parameters')
    const demand: DemandRecord = {
      type: 'insert',
      id: UUIDv4(),
      owner: getOrError(newDemand.roles, 'owner'),
      subtype: demandSubtypeParser.parse(getOrError(newDemand.metadata, 'subtype')),
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

  demand_comment: (version, transaction, sender, inputs, outputs) => {
    if (version !== 1) throw new Error(`Incompatible version ${version} for match2_propose process`)

    const newDemand = outputs[0]
    const demandId = inputs[0].localId

    const demandUpdate: DemandRecord = {
      type: 'update',
      id: demandId,
      state: demandStateParser.parse(getOrError(newDemand.metadata, 'state')),
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

    const attachment: AttachmentRecord = attachmentPayload(newDemand.metadata, sender, 'comment')
    const comment: DemandCommentRecord = {
      type: 'insert',
      id: UUIDv4(),
      state: 'created',
      demand: demandId,
      owner: sender,
      attachment_id: attachment.id,
      transaction_id: null,
    }

    return {
      attachments: new Map([[attachment.id, attachment]]),
      demandComments: new Map([[comment.id, comment]]),
      demands: new Map([[demandId, demandUpdate]]),
    }
  },

  match2_propose: (version, transaction, _sender, inputs, outputs) => {
    if (version !== 1) throw new Error(`Incompatible version ${version} for match2_propose process`)

    const newDemands = [
      { id: inputs[0].localId, tokenId: outputs[0].id },
      { id: inputs[1].localId, tokenId: outputs[1].id },
    ]
    const newMatchId = outputs[2].id
    const newMatch = outputs[2]

    if (transaction) {
      const id = transaction.local_id
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
      member_a: getOrError(newMatch.roles, 'member_a'),
      member_b: getOrError(newMatch.roles, 'member_b'),
      state: 'proposed',
      demand_a_id: inputs[0].localId,
      demand_b_id: inputs[1].localId,
      latest_token_id: newMatchId,
      original_token_id: newMatchId,
      replaces_id: null,
    }

    return {
      demands: new Map(
        newDemands.map(({ id, tokenId }) => [id, { type: 'update', id, state: 'created', latest_token_id: tokenId }])
      ),
      matches: new Map([[match.id, match]]),
    }
  },
  rematch2_propose: (version, transaction, _sender, inputs, outputs) => {
    if (version !== 1) {
      throw new Error(`Incompatible version ${version} for rematch2_propose process`)
    }
    const demandAIn = inputs[0]
    const demandAOut = outputs[0]
    const oldMatchIn = inputs[1]
    const oldMatchOut = outputs[1]
    const newDemandBIn = inputs[2]
    const newDemandBOut = outputs[2]
    const newMatchId = outputs[3].id
    const newMatch = outputs[3]

    const commonUpdates: ChangeSet = {
      demands: new Map([
        [
          demandAIn.localId,
          { type: 'update', id: demandAIn.localId, latest_token_id: demandAOut.id, state: 'allocated' },
        ],
        [
          newDemandBIn.localId,
          {
            type: 'update',
            id: newDemandBIn.localId,
            latest_token_id: newDemandBOut.id,
            state: 'created',
          },
        ],
      ]),
      matches: new Map([
        [
          oldMatchIn.localId,
          {
            type: 'update',
            id: oldMatchIn.localId,
            state: 'acceptedFinal',
            latest_token_id: oldMatchOut.id,
          },
        ],
      ]),
    }

    if (transaction) {
      const id = transaction.local_id
      return {
        demands: commonUpdates.demands,
        matches: new Map([
          ...(commonUpdates.matches || []),
          [
            id,
            {
              type: 'update',
              id,
              state: 'proposed',
              latest_token_id: newMatchId,
              original_token_id: newMatchId,
            },
          ],
        ]),
      }
    }
    const match: MatchRecord = {
      type: 'insert',
      id: UUIDv4(),
      optimiser: getOrError(newMatch.roles, 'optimiser'),
      member_a: getOrError(newMatch.roles, 'member_a'),
      member_b: getOrError(newMatch.roles, 'member_b'),
      state: 'proposed',
      demand_a_id: demandAIn.localId,
      demand_b_id: newDemandBIn.localId,
      latest_token_id: newMatchId,
      original_token_id: newMatchId,
      replaces_id: oldMatchIn.localId,
    }

    return {
      demands: commonUpdates.demands,
      matches: new Map([...(commonUpdates.matches || []), [match.id, match]]),
    }
  },

  match2_accept: (version, _transaction, _sender, inputs, outputs) => {
    if (version !== 1) throw new Error(`Incompatible version ${version} for match2_accept process`)

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
            state: match2StateParser.parse(getOrError(match.metadata, 'state')),
          },
        ],
      ]),
    }
  },
  match2_acceptFinal: (version, _transaction, _sender, inputs, outputs) => {
    if (version !== 1) throw new Error(`Incompatible version ${version} for match2_acceptFinal process`)

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
  rematch2_acceptFinal: (version, _transaction, _sender, inputs, outputs) => {
    if (version !== 1) throw new Error(`Incompatible version ${version} for rematch2_acceptFinal process`)

    const demandAIn = inputs[0]
    const demandAOut = outputs[0]
    const oldDemandBIn = inputs[1]
    const oldDemandBOut = outputs[1]
    const oldMatch2In = inputs[2]
    const oldMatch2Out = outputs[2]
    const newDemandBIn = inputs[3]
    const newDemandBOut = outputs[3]
    const newMatch2In = inputs[4] //rematch
    const newMatch2Out = outputs[4] //rematch

    return {
      demands: new Map([
        [
          demandAIn.localId,
          { type: 'update', id: demandAIn.localId, latest_token_id: demandAOut.id, state: 'allocated' },
        ],
        [
          oldDemandBIn.localId,
          { type: 'update', id: oldDemandBIn.localId, latest_token_id: oldDemandBOut.id, state: 'cancelled' },
        ],
        [
          newDemandBIn.localId,
          { type: 'update', id: newDemandBIn.localId, latest_token_id: newDemandBOut.id, state: 'allocated' },
        ],
      ]),
      matches: new Map([
        [
          oldMatch2In.localId,
          { type: 'update', id: oldMatch2In.localId, latest_token_id: oldMatch2Out.id, state: 'cancelled' },
        ],
        [
          newMatch2In.localId,
          { type: 'update', id: newMatch2In.localId, latest_token_id: newMatch2Out.id, state: 'acceptedFinal' },
        ],
      ]),
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  match2_reject: (version, _transaction, _sender, inputs, _outputs) => {
    if (version !== 1) throw new Error(`Incompatible version ${version} for match2_reject process`)

    const localId = inputs[0].localId

    return {
      matches: new Map([[localId, { id: localId, type: 'update', state: 'rejected' }]]),
    }
  },

  match2_cancel: (version, transaction, sender, inputs, outputs) => {
    if (version !== 1) throw new Error(`Incompatible version ${version} for match2_cancel process`)

    const [{ localId: localDemandAId }, { localId: localDemandBId }, { localId: matchLocalId }] = inputs
    const [demandA, demandB, match] = outputs
    const shared: { type: 'update'; state: 'cancelled' } = { type: 'update', state: 'cancelled' }

    const demands: Map<string, DemandRecord> = new Map([
      [localDemandAId, { id: localDemandAId, latest_token_id: demandA.id, ...shared }],
      [localDemandBId, { id: localDemandBId, latest_token_id: demandB.id, ...shared }],
    ])
    const matches: Map<string, MatchRecord> = new Map([
      [matchLocalId, { id: matchLocalId, latest_token_id: match.id, ...shared }],
    ])

    if (transaction) {
      return {
        match2Comments: new Map([[transaction.id, { ...shared, transaction_id: transaction.id, state: 'created' }]]),
        demands,
        matches,
      }
    }

    const attachment: AttachmentRecord = attachmentPayload(match.metadata, sender, 'comment')
    const comment: Match2CommentRecord = {
      type: 'insert',
      id: UUIDv4(),
      state: 'created',
      match2: matchLocalId,
      owner: sender,
      attachment_id: attachment.id,
      transaction_id: null,
    }

    return {
      attachments: new Map([[attachment.id, attachment]]),
      match2Comments: new Map([[comment.id, comment]]),
      demands,
      matches,
    }
  },
}

export default DefaultEventProcessors
