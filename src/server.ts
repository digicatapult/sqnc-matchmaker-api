import express, { Express } from 'express'
import { setup, serve } from 'swagger-ui-express'
import cors from 'cors'
import { json, urlencoded } from 'body-parser'

import env from './env'
import Indexer from './lib/indexer'
import ChainNode from './lib/chainNode'
import { errorHandler } from './lib/error-handler'
import { logger } from './lib/logger'
import Database from './lib/db'

import { RegisterRoutes } from './routes'
import * as swaggerJson from './swagger.json'

export default async (): Promise<Express> => {
  const app: Express = express()

  app.use(urlencoded({ extended: true }))
  app.use(json())
  app.use(cors())

  RegisterRoutes(app)
  app.use(errorHandler)
  app.use(['/swagger'], serve, setup(swaggerJson))

  const node = new ChainNode({
    host: env.NODE_HOST,
    port: env.NODE_PORT,
    logger,
    userUri: env.USER_URI,
  })

  if (env.ENABLE_INDEXER) {
    const indexer = new Indexer({ db: new Database(), logger, node })
    await indexer.start()
    indexer.processAllBlocks(await node.getLastFinalisedBlockHash()).then(() =>
      node.watchFinalisedBlocks(async (hash) => {
        await indexer.processAllBlocks(hash)
      })
    )
  }

  return app
}
