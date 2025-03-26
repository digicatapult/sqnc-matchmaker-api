import { UUID } from '../../models/strings.js'

type ChangeOperation = 'insert' | 'update'

interface Change {
  type: ChangeOperation
}

export type DemandRecord =
  | {
      type: 'insert'
      id: string
      owner: string
      subtype: string
      state: string
      parameters_attachment_id: string
      latest_token_id: number
      original_token_id: number
    }
  | {
      type: 'update'
      id: string
      state: string
      original_token_id?: number
      latest_token_id: number
    }

export type DemandCommentRecord =
  | {
      type: 'insert'
      id: string
      state: 'created'
      owner: string
      demand: string
      attachment_id: string
    }
  | {
      type: 'update'
      transaction_id: string
      state: 'created'
    }

export type MatchRecord =
  | {
      type: 'insert'
      id: string
      optimiser: string
      member_a: string
      member_b: string
      state: string
      demand_a_id: string
      demand_b_id: string
      latest_token_id: number
      original_token_id: number
      replaces_id?: UUID
    }
  | {
      type: 'update'
      id: string
      state: string
      original_token_id?: number
      latest_token_id?: number
    }
export type Match2CommentRecord =
  | {
      type: 'insert'
      id: string
      state: 'created'
      owner: string
      match2: string
      attachment_id: string
    }
  | {
      type: 'update'
      transaction_id: string
      state: 'created'
    }

export type AttachmentRecord = {
  type: 'insert'
  id: string
  filename?: string
  integrityHash: string
  ownerAddress: string
  size?: number
}

export type ChangeSet = {
  attachments?: Map<string, AttachmentRecord>
  demands?: Map<string, DemandRecord>
  matches?: Map<string, MatchRecord>
  demandComments?: Map<string, DemandCommentRecord>
  match2Comments?: Map<string, Match2CommentRecord>
}

const mergeMaps = <T extends Change>(base?: Map<string, T>, update?: Map<string, T>) => {
  if (!update) {
    return base
  }

  const result = base || new Map<string, T>()
  for (const [key, value] of update) {
    const base = result.get(key) || { type: 'update' }
    const operation = base.type === 'insert' || value.type === 'insert' ? 'insert' : 'update'
    result.set(key, {
      ...base,
      ...value,
      type: operation,
    })
  }

  return result
}

export const mergeChangeSets = (base: ChangeSet, update: ChangeSet) => {
  const attachments = mergeMaps(base.attachments, update.attachments)
  const demands = mergeMaps(base.demands, update.demands)
  const matches = mergeMaps(base.matches, update.matches)
  const demandComments = mergeMaps(base.demandComments, update.demandComments)

  const result: ChangeSet = {
    ...(attachments ? { attachments } : {}),
    ...(demands ? { demands } : {}),
    ...(matches ? { matches } : {}),
    ...(demandComments ? { demandComments } : {}),
  }

  return result
}

export const findLocalIdInChangeSet = (change: ChangeSet, tokenId: number): UUID | null => {
  const demandRecordValues = [...(change.demands?.values() || [])]
  const matchRecordValues = [...(change.matches?.values() || [])]

  const match = [...demandRecordValues, ...matchRecordValues].find((el) => el.latest_token_id === tokenId)
  return match?.id || null
}
