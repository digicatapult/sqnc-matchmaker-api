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
    return this.db()
      .demand()
      .select(['id', 'owner', 'state', 'parameters_attachment_id AS parametersAttachmentId'])
      .where({ subtype })
  }

  getDemand = async (id: UUID) => {
    return this.db().demand().select(['*', 'parameters_attachment_id AS parametersAttachmentId']).where({ id })
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
    return this.db().transaction().select('*').where({ id })
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

  getCreationID = async (capacityId: UUID) => {
    return this.db().transaction().select('*').where({ id: capacityId })
  }
}
