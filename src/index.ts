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

    const indexer = new Indexer({ db: new Database(), logger, node })
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
