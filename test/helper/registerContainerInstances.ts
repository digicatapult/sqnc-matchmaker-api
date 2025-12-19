import { type Knex } from 'knex'
import { KnexToken, clientSingleton } from '../../src/lib/db/knexClient.js'
import { container } from 'tsyringe'
import type { Logger } from 'pino'
import env, { type Env, EnvToken } from '../../src/env.js'
import { LoggerToken, logger } from '../../src/lib/logger.js'

export const registerContainerInstances = () => {
  container.register<Logger>(LoggerToken, { useValue: logger })
  container.register<Env>(EnvToken, { useValue: env })
  container.register<Knex>(KnexToken, { useValue: clientSingleton })
}
