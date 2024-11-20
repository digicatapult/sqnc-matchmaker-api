import 'reflect-metadata'
import { Express } from 'express'

import Indexer from './lib/indexer/index.js'
import ChainNode from './lib/chainNode.js'
import Database from './lib/db/index.js'
import Server from './server.js'
import env from './env.js'
import { logger } from './lib/logger.js'
import { container } from 'tsyringe'
;(async () => {
  const app: Express = await Server()

  if (env.ENABLE_INDEXER) {
    const node = new ChainNode({
      host: env.NODE_HOST,
      port: env.NODE_PORT,
      logger,
      userUri: env.USER_URI,
    })
    container.register<Indexer>('Indexer', {
      useFactory: () =>
        new Indexer({
          db: new Database(),
          logger,
          node,
          startupTime: new Date(),
        }),
    })
    const indexer = container.resolve<Indexer>('Indexer')
    // const indexer = new Indexer({ db: new Database(), logger, node, startupTime: new Date() })
    await indexer.start()
    indexer.processAllBlocks(await node.getLastFinalisedBlockHash()).then(() =>
      node.watchFinalisedBlocks(async (hash) => {
        await indexer.processAllBlocks(hash)
      })
    )
  }

  app.listen(env.PORT, () => {
    logger.info(`sqnc-matchmaker-api listening on ${env.PORT} port`)
  })
})()
