import knex, { Knex } from 'knex'
import fs from 'fs'
import path from 'path'
import type { Logger } from 'pino'

import { logger } from '../logger'
import { pgConfig } from './knexfile'

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
}
