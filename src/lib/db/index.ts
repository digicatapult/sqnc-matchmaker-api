import knex, { Knex } from 'knex'
import type { Logger } from 'pino'

import { logger } from '../logger'
import { pgConfig } from './knexfile'
import { DemandSubtype } from '../../models/demand'
import { UUID } from '../../models/uuid'

const TABLES: string[] = ['attachment', 'demand', 'transaction', 'match2']

export interface Models<V> {
  [key: string | number]: V[keyof V]
}

export type Query = Knex.QueryBuilder

const demandColumns = [
  'id',
  'owner',
  'state',
  'subtype',
  'parameters_attachment_id AS parametersAttachmentId',
  'latest_token_id AS latestTokenId',
  'original_token_id AS originalTokenId',
]

const match2Columns = [
  'id',
  'state',
  'optimiser',
  'member_a AS memberA',
  'member_b AS memberB',
  'demand_a_id AS demandA',
  'demand_b_id AS demandB',
  'latest_token_id AS latestTokenId',
  'original_token_id AS originalTokenId',
]

const transactionColumns = [
  'id',
  'state',
  'local_id AS localId',
  'token_type AS tokenType',
  'created_at AS submittedAt',
  'updated_at AS updatedAt',
]

export default class Database {
  public client: Knex
  private log: Logger
  public db: () => Models<Query> | any

  constructor() {
    this.log = logger
    this.client = knex(pgConfig)
    this.db = (models: Models<Query> = {}) => {
      TABLES.forEach((name: string) => {
        this.log.debug(`initializing ${name} db model`)
        models[name] = () => this.client(name)
      })
      return models
    }
  }

  getAttachment = async (parametersAttachmentId: string) => {
    return this.db().attachment().where({ id: parametersAttachmentId })
  }

  insertDemand = async (capacity: object) => {
    return this.db().demand().insert(capacity).returning('*')
  }

  getDemands = async (subtype: DemandSubtype) => {
    return this.db().demand().select(demandColumns).where({ subtype })
  }

  getDemand = async (id: UUID) => {
    return this.db().demand().select(demandColumns).where({ id })
  }

  getDemandWithAttachment = async (capacityId: UUID, subtype: DemandSubtype) => {
    return this.db()
      .demand()
      .join('attachment', 'demand.parameters_attachment_id', 'attachment.id')
      .select()
      .where({ 'demand.id': capacityId, subtype })
  }

  insertTransaction = async (transaction: object) => {
    return this.db().transaction().insert(transaction).returning('*')
  }

  getTransaction = async (id: UUID) => {
    return this.db().transaction().select(transactionColumns).where({ id: id })
  }

  getTransactionsByLocalId = async (local_id: UUID) => {
    return this.db().transaction().select(transactionColumns).where({ local_id })
  }

  updateTransaction = async (transactionId: UUID, transaction: object) => {
    return this.db()
      .transaction()
      .update({ ...transaction, updated_at: this.client.fn.now() })
      .where({ id: transactionId })
      .returning('local_id AS localId')
  }

  updateLocalWithTokenId = async (table: string, localId: UUID, latestTokenId: number, isNewEntity: boolean) => {
    return this.db()
      [table]()
      .update({
        latest_token_id: latestTokenId,
        ...(isNewEntity && { original_token_id: latestTokenId }),
        updated_at: this.client.fn.now(),
      })
      .where({ id: localId })
  }

  insertMatch2 = async (match2: object) => {
    return this.db().match2().insert(match2).returning(match2Columns)
  }

  getMatch2s = async () => {
    return this.db().match2().select(match2Columns)
  }

  getMatch2 = async (match2Id: UUID) => {
    return this.db().match2().where({ id: match2Id }).select(match2Columns)
  }

  getDemandLatestTokenId = async (demandId: UUID) => {
    return this.db().demand().where({ id: demandId }).select('latest_token_id AS latestTokenId')
  }
}
