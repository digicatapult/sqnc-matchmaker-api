import type { Knex } from 'knex'

import { DemandState, DemandSubtype } from '../../models/demand.js'
import { HEX, UUID } from '../../models/strings.js'
import { Match2State } from '../../models/match2.js'
import { TransactionApiType, TransactionState, TransactionType } from '../../models/transaction.js'
import { singleton, inject, injectable } from 'tsyringe'
import { KnexToken } from './knexClient.js'

const tablesList = [
  'attachment',
  'demand',
  'transaction',
  'match2',
  'processed_blocks',
  'unprocessed_blocks',
  'demand_comment',
  'match2_comment',
] as const
type TABLES_TUPLE = typeof tablesList
type TABLE = TABLES_TUPLE[number]

export type Models<V> = {
  [key in TABLE]: V
}

export type QueryBuilder = Knex.QueryBuilder

export type DbBlock = { hash: HEX; parent: HEX; height: string }
export type DbBlockTrimmed = { hash: string; parent: string; height: string }

const attachmentColumns = ['id', 'filename', 'size', 'ipfs_hash as ipfsHash', 'created_at AS createdAt']

export interface AttachmentRow {
  id: UUID
  filename: string | null
  size: number | null
  ipfsHash: string
  createdAt: Date
}

const demandColumns = [
  'id',
  'owner',
  'state',
  'subtype',
  'parameters_attachment_id AS parametersAttachmentId',
  'latest_token_id AS latestTokenId',
  'original_token_id AS originalTokenId',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
]

export interface DemandRow {
  id: string
  owner: string
  state: DemandState
  subtype: DemandSubtype
  parametersAttachmentId: UUID
  latestTokenId: number | null
  originalTokenId: number | null
  createdAt: Date
  updatedAt: Date
}

export interface DemandWithAttachmentRow {
  owner: string
  parametersAttachmentId: UUID
  state: DemandState
  filename: string | 'json' | null
  size: number | null
  subtype: DemandSubtype
  ipfs_hash: string
  latestTokenId: number
  originalTokenId: number
}

const demandCommentsColumns = ['id', 'owner', 'state', 'attachment AS attachmentId', 'created_at AS createdAt']

export interface DemandCommentRow {
  id: UUID
  owner: string
  state: 'pending' | 'created'
  attachmentId: UUID
  createdAt: Date
}

const match2Columns = [
  'id',
  'state',
  'optimiser',
  'member_a AS memberA',
  'member_b AS memberB',
  'demand_a_id AS demandA',
  'demand_b_id AS demandB',
  'replaces_id AS replaces',
  'latest_token_id AS latestTokenId',
  'original_token_id AS originalTokenId',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
]

export interface Match2Row {
  id: UUID
  state: Match2State
  optimiser: string
  memberA: string
  memberB: string
  demandA: UUID
  demandB: UUID
  latestTokenId: number | null
  originalTokenId: number | null
  createdAt: Date
  updatedAt: Date
  replaces?: UUID
}

const transactionColumns = [
  'id',
  'state',
  'local_id AS localId',
  'api_type AS apiType',
  'transaction_type AS transactionType',
  'created_at AS submittedAt',
  'updated_at AS updatedAt',
]

export interface Transaction {
  id: UUID
  state: TransactionState
  localId: UUID
  apiType: TransactionApiType
  transactionType: TransactionType
  submittedAt: Date
  updatedAt: Date
}

const dbBlocksColumns = ['hash', 'height', 'parent']

function trim0x(input: DbBlock): DbBlockTrimmed {
  return {
    hash: input.hash.startsWith('0x') ? input.hash.slice(2) : input.hash,
    height: input.height,
    parent: input.parent.startsWith('0x') ? input.parent.slice(2) : input.parent,
  }
}

function restore0x(input: DbBlockTrimmed): DbBlock {
  return {
    hash: input.hash.startsWith('0x') ? (input.hash as HEX) : `0x${input.hash}`,
    height: input.height,
    parent: input.parent.startsWith('0x') ? (input.parent as HEX) : `0x${input.parent}`,
  }
}

// const clientSingleton: Knex = knex(pgConfig)

@singleton()
export default class Database {
  private client: Knex
  public db: () => Models<() => QueryBuilder>

  constructor(@inject(KnexToken) client: Knex) {
    this.client = client
    if (!client) {
      throw new Error('Knex instance is undefined. Check if it is correctly registered in DI.')
    }
    const models = tablesList.reduce((acc, name) => {
      return {
        [name]: () => this.client.table(name),
        ...acc,
      }
    }, {}) as Models<() => QueryBuilder>
    this.db = () => models
  }

  getAttachments = async ({ updatedSince }: { updatedSince?: Date } = {}): Promise<AttachmentRow[]> => {
    const query = this.db().attachment().select(attachmentColumns)
    // note the use of created_at here since attachments are immutable
    return updatedSince ? query.where('created_at', '>', updatedSince) : query
  }

  getAttachment = async (parametersAttachmentId: string): Promise<[AttachmentRow] | []> => {
    return this.db().attachment().select(attachmentColumns).where({ id: parametersAttachmentId })
  }

  updateAttachment = async (id: string, filename: string, size: number) => {
    return this.db().attachment().update({ filename, size }).where({ id })
  }

  insertAttachment = async (attachment: object): Promise<[AttachmentRow]> => {
    const [result] = await this.db().attachment().insert(attachment).returning(attachmentColumns)
    return [result]
  }

  insertDemand = async (demand: object) => {
    return this.db().demand().insert(demand).returning('*')
  }

  updateDemand = async (id: UUID, demand: object) => {
    return this.db()
      .demand()
      .update({
        ...demand,
        updated_at: new Date(),
      })
      .where({ id })
      .returning('*')
  }

  getDemands = async ({
    subtype,
    updatedSince,
  }: {
    subtype: DemandSubtype
    updatedSince?: Date
  }): Promise<DemandRow[]> => {
    const query = this.db().demand().select(demandColumns).where({ subtype })
    if (updatedSince) {
      return query.where('updated_at', '>', updatedSince)
    }
    return query
  }

  getDemand = async (id: UUID): Promise<[DemandRow] | []> => {
    return this.db().demand().select(demandColumns).where({ id })
  }

  getDemandComments = async (demandId: UUID, state?: 'pending' | 'created'): Promise<DemandCommentRow[]> => {
    const query = this.db()
      .demand_comment()
      .select(demandCommentsColumns)
      .where({ demand: demandId })
      .orderBy('created_at', 'asc')

    if (state) {
      return query.where({ state })
    }
    return query
  }

  getDemandCommentForTransaction = async (transactionId: UUID): Promise<[DemandCommentRow] | []> => {
    const [result] = await this.db()
      .demand_comment()
      .select(demandCommentsColumns)
      .where({ transaction_id: transactionId })
      .orderBy('created_at', 'asc')

    return [result]
  }

  getDemandWithAttachment = async (id: UUID, subtype: DemandSubtype): Promise<DemandWithAttachmentRow[]> => {
    return this.db()
      .demand()
      .join('attachment', 'demand.parameters_attachment_id', 'attachment.id')
      .select()
      .where({ 'demand.id': id, subtype })
  }

  insertDemandComment = async (comment: object) => {
    return this.db().demand_comment().insert(comment).returning('*')
  }

  updateDemandCommentForTransaction = async (transactionId: UUID, comment: object) => {
    return this.db()
      .demand_comment()
      .update({
        ...comment,
        updated_at: this.client.fn.now(),
      })
      .where({ transaction_id: transactionId })
      .returning('*')
  }

  insertMatch2Comment = async (comment: object) => {
    return this.db().match2_comment().insert(comment).returning('*')
  }

  updateMatch2CommentForTransaction = async (transactionId: UUID, comment: object) => {
    return this.db()
      .match2_comment()
      .update({
        ...comment,
        updated_at: this.client.fn.now(),
      })
      .where({ transaction_id: transactionId })
      .returning('*')
  }

  insertTransaction = async ({ hash, ...rest }: { hash: HEX } & Record<string, string>) => {
    return this.db()
      .transaction()
      .insert({ hash: hash.slice(2), ...rest })
      .returning(transactionColumns)
  }

  getTransaction = async (id: UUID): Promise<[Transaction] | []> => {
    return this.db().transaction().select(transactionColumns).where({ id })
  }

  findTransaction = async (callHash: HEX) => {
    const transactions = (await this.db()
      .transaction()
      .select(transactionColumns)
      .where({ hash: callHash.substring(2) })) as Transaction[]

    return transactions.length !== 0 ? transactions[0] : null
  }

  getTransactions = async ({
    state,
    apiType,
    updatedSince,
  }: {
    state?: TransactionState
    apiType?: TransactionApiType
    updatedSince?: Date
  }) => {
    let query = this.db().transaction().select(transactionColumns)
    if (state) {
      query = query.where({ state })
    }
    if (apiType) {
      query = query.where({ api_type: apiType })
    }
    if (updatedSince) {
      query = query.where('updated_at', '>', updatedSince)
    }
    return query
  }

  getTransactionsByLocalId = async ({
    localId,
    transactionType,
    updatedSince,
  }: {
    localId: UUID
    transactionType: TransactionType
    updatedSince?: Date
  }) => {
    const query = this.db()
      .transaction()
      .select(transactionColumns)
      .where({ local_id: localId, transaction_type: transactionType })
    if (updatedSince) {
      return query.where('updated_at', '>', updatedSince)
    }
    return query
  }

  updateTransaction = async (transactionId: UUID, transaction: object) => {
    return this.db()
      .transaction()
      .update({ ...transaction, updated_at: this.client.fn.now() })
      .where({ id: transactionId })
      .returning('local_id AS localId')
  }

  updateTransactionState = (transactionId: UUID) => {
    return async (state: TransactionState) => {
      await this.updateTransaction(transactionId, { state })
    }
  }

  updateLocalWithTokenId = async (
    table: TABLE,
    localId: UUID,
    state: DemandState | Match2State,
    latestTokenId: number,
    isNewEntity: boolean
  ) => {
    return this.db()
      [table]()
      .update({
        state,
        latest_token_id: latestTokenId,
        ...(isNewEntity && { original_token_id: latestTokenId }),
        updated_at: this.client.fn.now(),
      })
      .where({ id: localId })
  }

  insertMatch2 = async (match2: object): Promise<[Match2Row]> => {
    const [result] = await this.db().match2().insert(match2).returning(match2Columns)
    return [result]
  }

  updateMatch2 = async (id: UUID, match2: object) => {
    return this.db()
      .match2()
      .update({
        ...match2,
        updated_at: new Date(),
      })
      .where({ id })
      .returning('*')
  }

  getMatch2s = async ({ updatedSince }: { updatedSince?: Date } = {}): Promise<Match2Row[]> => {
    const query = this.db().match2().select(match2Columns)
    if (updatedSince) {
      return query.where('updated_at', '>', updatedSince)
    }
    return query
  }

  getMatch2 = async (match2Id: UUID): Promise<[Match2Row] | []> => {
    return this.db().match2().select(match2Columns).where({ id: match2Id })
  }

  getLastProcessedBlock = async (): Promise<DbBlock | null> => {
    const blockRecords = await this.db().processed_blocks().select(dbBlocksColumns).orderBy('height', 'desc').limit(1)
    return blockRecords.length !== 0 ? restore0x(blockRecords[0]) : null
  }

  getNextUnprocessedBlockAtHeight = async (height: number): Promise<DbBlock | null> => {
    const blockRecords = await this.db().unprocessed_blocks().select(dbBlocksColumns).where({ height }).limit(1)
    return blockRecords.length !== 0 ? restore0x(blockRecords[0]) : null
  }

  getNextUnprocessedBlockAboveHeight = async (height: number): Promise<DbBlock | null> => {
    const blockRecords = await this.db()
      .unprocessed_blocks()
      .select(dbBlocksColumns)
      .where('height', '>', height)
      .orderBy('height', 'asc')
      .limit(1)
    return blockRecords.length !== 0 ? restore0x(blockRecords[0]) : null
  }

  findLocalIdForToken = async (tokenId: number): Promise<UUID | null> => {
    const result = (await Promise.all([
      this.db().demand().select(['id']).where({ latest_token_id: tokenId }),
      this.db().match2().select(['id']).where({ latest_token_id: tokenId }),
    ])) as { id: UUID }[][]
    const flatten = result.reduce((acc, set) => [...acc, ...set], [])
    return flatten[0]?.id || null
  }

  insertProcessedBlock = async (block: DbBlock): Promise<void> => {
    await this.db().processed_blocks().insert(trim0x(block))
  }

  tryInsertUnprocessedBlock = async (block: DbBlock): Promise<void> => {
    await this.db().unprocessed_blocks().insert(trim0x(block)).onConflict().ignore()
  }

  withTransaction = (update: (db: Database) => Promise<void>) => {
    return this.client.transaction(async (trx) => {
      const decorated = new Database(trx)
      await update(decorated)
    })
  }
}
