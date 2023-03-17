import knex, { Knex } from 'knex'
import path from 'path'
import type { Logger } from 'pino'

import { logger } from '../logger'
import { pgConfig } from './knexfile'
import { DemandSubtype } from '../../models/demand'
import { UUID } from '../../models/uuid'
import Attachment from '../../models'
import Demand from '../../models'

const MODELS = [Attachment, Demand]

export interface Models<V> {
  [key: string | number]: V[keyof V]
}

export type Query = Knex.QueryBuilder

/** Creates a connection to the postgres instance
 * usage: var client = new Database()
 * db = client.init()
 * db.Example().where(id); db.Table.select(id);
 */
export default class Database {
  public client: Knex
  private log: Logger
  public db: () => Models<Query> | any

  constructor() {
    this.log = logger
    this.client = knex(pgConfig)
    this.db = (models: Models<Query> = {}) => {
      MODELS.forEach((file: unknown) => {
        const { name } = path.parse(file as any)
        if (name != 'index.d' && name != 'health') {
          this.log.debug(`initializing ${name} db model`)
          models[name] = () => this.client(name)
        }
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
      .select(['id', 'owner', 'status', 'parameters_attachment_id AS parametersAttachmentId'])
      .where({ subtype })
  }

  getDemand = async (capacityId: UUID, subtype: DemandSubtype) => {
    return this.db()
      .demand()
      .select(['id', 'owner', 'status', 'parameters_attachment_id AS parametersAttachmentId'])
      .where({ id: capacityId, subtype })
  }
}
