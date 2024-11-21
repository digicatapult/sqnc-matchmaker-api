import { before, after } from 'mocha'
import { Express } from 'express'

import createHttpServer from '../../src/server.js'
import Indexer from '../../src/lib/indexer/index.js'

import Database from '../../src/lib/db/index.js'
import ChainNode from '../../src/lib/chainNode.js'
import { logger } from '../../src/lib/logger.js'
import { container } from 'tsyringe'

const db = new Database()

export const withAppAndIndexer = (context: { app: Express; indexer: Indexer }) => {
  before(async function () {
    context.app = await createHttpServer()
    const node = container.resolve(ChainNode)

    const blockHash = await node.getLastFinalisedBlockHash()
    const blockHeader = await node.getHeader(blockHash)
    await db
      .insertProcessedBlock({
        hash: blockHash,
        height: blockHeader.height.toString(10),
        parent: blockHash,
      })
      .catch(() => {
        // intentional ignorance of errors
      })

    context.indexer = new Indexer({ db: new Database(), logger, node })
    await context.indexer.start()
    context.indexer.processAllBlocks(await node.getLastFinalisedBlockHash()).then(() =>
      node.watchFinalisedBlocks(async (hash) => {
        await context.indexer.processAllBlocks(hash)
      })
    )
  })

  after(async function () {
    await context.indexer.close()
  })
}
