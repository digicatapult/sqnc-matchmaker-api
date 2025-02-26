import 'reflect-metadata'
import { Express } from 'express'
import { container } from 'tsyringe'

import Indexer from './lib/indexer/index.js'
import ChainNode from './lib/chainNode.js'
import Database from './lib/db/index.js'
import Server from './server.js'
import env from './env.js'
import { logger } from './lib/logger.js'
;(async () => {
  const app: Express = await Server()

  if (env.ENABLE_INDEXER) {
    const node = container.resolve(ChainNode)
    container.register<Indexer>('Indexer', {
      useValue: new Indexer({ db: new Database(), logger, node, startupTime: new Date(), env: env }),
    })
    const indexer = container.resolve<Indexer>('Indexer')

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
