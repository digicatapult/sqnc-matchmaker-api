import { Express } from 'express'

import Server from './server'
import env from './env'
import { logger } from './lib/logger'

import Database from './lib/db'
import Indexer from './lib/indexer'
import ChainNode from './lib/chainNode'
;(async () => {
  const app: Express = await Server()

  const node = new ChainNode({
    host: env.NODE_HOST,
    port: env.NODE_PORT,
    logger,
  })

  const handleBlock = () => Promise.resolve()

  if (env.ENABLE_INDEXER) {
    const indexer = new Indexer({ db: new Database(), logger, node, handleBlock })
    await indexer.start()
  }

  app.listen(env.PORT, () => {
    logger.info(`dscp-matchmaker-api listening on ${env.PORT} port`)
  })
})()
