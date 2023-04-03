import { Express } from 'express'

import Server from './server'
import env from './env'
import { logger } from './lib/logger'

import Database from './lib/db'
import Indexer from './lib/indexer'
;(async () => {
  const app: Express = await Server()

  if (env.ENABLE_INDEXER) {
    const indexer = new Indexer({ db: new Database(), logger })
    await indexer.start()
  }

  app.listen(env.PORT, () => {
    logger.info(`dscp-matchmaker-api listening on ${env.PORT} port`)
  })
})()
