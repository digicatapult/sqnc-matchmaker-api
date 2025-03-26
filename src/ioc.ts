import { IocContainer } from '@tsoa/runtime'
import { container } from 'tsyringe'
import { Logger } from 'pino'

import env, { type Env, EnvToken } from './env.js'
import { logger, LoggerToken } from './lib/logger.js'
import { Knex } from 'knex'
import { KnexToken, clientSingleton } from './lib/db/knexClient.js'

export const iocContainer: IocContainer = {
  get: (controller) => {
    return container.resolve(controller as never)
  },
}

export function resetContainer() {
  container.clearInstances()
  container.register<Logger>(LoggerToken, { useValue: logger })
  container.register<Env>(EnvToken, { useValue: env })
  container.register<Knex>(KnexToken, { useValue: clientSingleton })
}
