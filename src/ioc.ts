import { IocContainer } from '@tsoa/runtime'
import { container } from 'tsyringe'
import { Logger } from 'pino'

import env, { type Env, EnvToken } from './env.js'
import { logger, LoggerToken } from './lib/logger.js'

export const iocContainer: IocContainer = {
  get: <T>(controller: { prototype: T }): T => {
    return container.resolve<T>(controller as never)
  },
}

export function resetContainer() {
  container.reset()
  container.register<Env>(EnvToken, { useValue: env })
  container.register<Logger>(LoggerToken, { useValue: logger })
}
