import knex, { Knex } from 'knex'
import fs from 'fs'
import path from 'path'
import type { Logger } from 'pino'

import { logger } from '../logger'
import { pgConfig } from './knexfile'
import { DemandSubtype } from '../../models/demand'
import { UUID } from '../../models/uuid'

const MODELS_DIRECTORY = path.join(__dirname, '../../models')

/** Creates a connection to the postgres instance
 * usage: var db = new Database().init()
 * db.Example().where(id); db.Table.select(id);
 */
export default class Database {
  public client: Knex
  private log: Logger
  public db: any

  constructor() {
    this.log = logger
    this.client = knex(pgConfig)
    this.db = (models: any = {}) => {
      this.log.debug('initializing db models')
      fs.readdirSync(MODELS_DIRECTORY).forEach((file: string): any => {
        const { name } = path.parse(file)
        // TODO check if table exists -> append to the db object
        if (name != 'index.d') models[name] = () => this.client(name)
      })
      return models
    }
  }

  getAttachment = async (parametersAttachmentId: string) => {
    return this.db().attachments().where({ id: parametersAttachmentId })
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
      .join('attachments', 'demand.parameters_attachment_id', 'attachments.id')
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
