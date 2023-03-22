import knex, { Knex } from 'knex'
import type { Logger } from 'pino'

import { logger } from '../logger'
import { pgConfig } from './knexfile'
import { DemandSubtype } from '../../models/demand'
import { UUID } from '../../models/uuid'

const TABLES: Model[] = ['attachment', 'demand', 'transaction', 'match2']

/* TODO define interface for whole class (methods/constructor) 
type CreateMethod = (query: () => Knex.QueryBuilder, model: Model, data: { [key: string]: string }) => Promise<void>
type GetByIdMethod = (query: () => Knex.QueryBuilder, model: Model, id: UUID) => Promise<void>
type ORMWrapper = {
  getAll: GetAllMethod... 
  getById: ...
  ...
}
*/

export type Query = Knex.QueryBuilder
export type Model = 'attachment' | 'demand' | 'transaction' | 'match2'
export interface Models<V> {
  [k: string]: V[keyof V]
}

export default class Database {
  public client: Knex
  private log: Logger
  private limit = 1000

  public db: () => Models<Query>
  public db2: () => any

  constructor() {
    this.log = logger
    this.client = knex(pgConfig)
    this.db = (models: Models<Query> = {}) => {
      TABLES.forEach((name: Model) => {
        models[name] = () => this.client(name)
      })
      return models
    }
    // TMP to give some breathing space
    this.db2 = (models: { [k: string]: Models<Query> } = {}) => {
      TABLES.forEach((model: Model) => {
        this.log.debug(`initializing ${model} db model`)
        const query = () => this.client(model)
        models[model] = {
          getAll: () => this.getAll(query, model),
          create: (data: any) => this.create(query, model, data),
          getById: (id: UUID) => this.getById(query, model, id),
          query, // for performing raw queries e.g. query('*').where(args).innerJoin...
        }
      })
      return models
    }
  }

  private getAll(query: () => Knex.QueryBuilder, model: Model): Promise<void> {
    try {
      this.log.info('attempting to retrieve the total of 100 records', { model })

      return query().select('*').limit(this.limit)
    } catch (err: InstanceType<Error & any>) {
      this.log.error(err)
      // TODO database errors; atm it will return 500 along with message
      throw new Error(err.message)
    }
  }

  private getById(query: () => Knex.QueryBuilder, model: Model, id: UUID): any {
    try {
      this.log.info('retrieving record', { model, id })

      return query().where({ id })
    } catch (err: InstanceType<Error & any>) {
      this.log.error(err)
      // TODO database errors; atm it will return 500 along with message
      throw new Error(err.message)
    }
  }

  private async create(query: () => Knex.QueryBuilder, model: Model, data: any): Promise<void> {
    try {
      this.log.info('attempting to insert', { model, data })
      const id = await query().insert(data).returning('id')
      this.log.debug('returning new record', { id, model })

      return query().where({ id })
    } catch (err: InstanceType<Error & any>) {
      this.log.error(err)
      // TODO database errors; atm it will return 500 along with message
      throw new Error(err.message)
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
}
