import knex, { type Knex } from 'knex'
import { pgConfig } from './knexfile.js'

// Create a singleton Knex client instance
export const clientSingleton: Knex = knex(pgConfig)

// Create a token for DI registration
export const KnexToken = Symbol('KnexClient')
