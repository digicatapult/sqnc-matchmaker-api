import knex, { Knex } from 'knex'
import fs from 'fs'
import path from 'path'
import type { Logger } from 'pino'

import { logger } from '../logger'
import { pgConfig } from './knexfile'

const MODELS_DIRECTORY = path.join(__dirname, '../../models')

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
  public init: () => Models<Query> // TODO

  constructor() {
    this.log = logger
    this.client = knex(pgConfig)
    this.init = (models: Models<Query> = {}) => {
      fs.readdirSync(MODELS_DIRECTORY).forEach((file: string) => {
        const { name } = path.parse(file)
        // TODO check if table exists -> append to the db object
        if (name != 'index.d' && name != 'health') {
          this.log.debug(`initializing ${name} db model`)
          models[name] = () => this.client(name)
        }
      })
      return models
    }
  }
}
