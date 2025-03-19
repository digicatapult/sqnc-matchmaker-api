import 'reflect-metadata'
import { Express } from 'express'
import { container } from 'tsyringe'
import { resetContainer } from './ioc.js'

import Indexer from './lib/indexer/index.js'
import Server from './server.js'
import { Env, EnvToken } from './env.js'
import { LoggerToken } from './lib/logger.js'
import { Logger } from 'pino'

import ChainNode from './lib/chainNode.js'
;(async () => {
  // Register singletons in tsyringe
  resetContainer()
  const logger = container.resolve<Logger>(LoggerToken)
  const env = container.resolve<Env>(EnvToken)
  const app: Express = await Server()

  if (env.ENABLE_INDEXER) {
    const node = container.resolve(ChainNode)

    // container.registerSingleton(Indexer)
    const indexer = container.resolve(Indexer)

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
