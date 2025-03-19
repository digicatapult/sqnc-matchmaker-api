import { pino, type Logger } from 'pino'

import env from '../env.js'

export const logger: Logger = pino(
  {
    name: 'sqnc-matchmaker-api',
    timestamp: true,
    level: env.LOG_LEVEL,
  },
  process.stdout
)

export const LoggerToken = Symbol('Logger')
