import { Express } from 'express'

import createHttpServer from '../../src/server.js'
import Indexer from '../../src/lib/indexer/index.js'

import Database from '../../src/lib/db/index.js'
import ChainNode from '../../src/lib/chainNode.js'
import { logger } from '../../src/lib/logger.js'
import { container } from 'tsyringe'
import env from '../../src/env.js'

const db = new Database()

export const withAppAndIndexer = (context: { app: Express; indexer: Indexer }) => {
  beforeEach(async function () {
    context.app = await createHttpServer()
    const node = container.resolve(ChainNode)

    // await node.sealBlock()
    await node.clearAllTransactions()

    const blockHash = await node.getLastFinalisedBlockHash()
    const blockHeader = await node.getHeader(blockHash)
    await db
      .insertProcessedBlock({
        hash: blockHash,
        height: blockHeader.height.toString(10),
        parent: blockHash,
      })
      .catch((err: any) => {
        // intentional ignorance of errors
        if (err.constraint !== 'processed_blocks_pkey') {
          console.log(err)
          throw err
        }
      })

    context.indexer = new Indexer({ db: new Database(), logger, node, startupTime: new Date(), env })
    await context.indexer.start()
    context.indexer.processAllBlocks(await node.getLastFinalisedBlockHash()).then(() =>
      node.watchFinalisedBlocks(async (hash) => {
        await context.indexer.processAllBlocks(hash)
      })
    )
  })

  afterEach(async function () {
    await context.indexer.close()
  })
}
