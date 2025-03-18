import { Express } from 'express'

import createHttpServer from '../../src/server.js'
import Indexer from '../../src/lib/indexer/index.js'

import Database from '../../src/lib/db/index.js'
import ChainNode from '../../src/lib/chainNode.js'
import { container } from 'tsyringe'

export const withAppAndIndexer = (context: { app: Express; indexer: Indexer }) => {
  const db = container.resolve(Database)
  beforeEach(async function () {
    context.app = await createHttpServer()
    const node = container.resolve(ChainNode)

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
          throw err
        }
      })

    context.indexer = container.resolve(Indexer)
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
