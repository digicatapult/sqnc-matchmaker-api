import { Express } from 'express'

import createHttpServer from '../../src/server.js'
import Indexer from '../../src/lib/indexer/index.js'

import Database from '../../src/lib/db/index.js'
import ChainNode from '../../src/lib/chainNode.js'
import { container } from 'tsyringe'
import ExtendedChainNode from './testInstanceChainNode.js'
import { pollPermissionState } from './poll.js'

export const withAppAndIndexer = (context: { app: Express; indexer: Indexer }) => {
  const db = container.resolve(Database)
  beforeEach(async function () {
    context.app = await createHttpServer()
    const node = container.resolve(ChainNode)

    await node.clearAllTransactions()

    const blockHash = await node.getLastFinalisedBlockHash()
    const blockHeader = await node.getHeader(blockHash)
    await db
      .insert('processed_blocks', {
        hash: blockHash.slice(2),
        height: BigInt(blockHeader.height),
        parent: blockHash.slice(2),
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

const scopes = ['member_a', 'member_b', 'optimiser'] as const
export const withAllPermissions = (address: string) => {
  beforeEach(async function () {
    const node = container.resolve(ExtendedChainNode)
    const db = container.resolve(Database)

    for (const scope of scopes) {
      const extrinsic = await node.prepareRunProcessAsSudo({
        process: { id: 'permission_create', version: 1 },
        inputs: [],
        outputs: [
          {
            roles: { owner: address },
            metadata: {
              '@version': { type: 'LITERAL', value: '1' },
              '@type': { type: 'LITERAL', value: 'Permission' },
              scope: { type: 'LITERAL', value: scope },
            },
          },
        ],
      })
      await node.submitRunProcess(extrinsic, () => Promise.resolve())
    }

    await node.clearAllTransactions()
    await Promise.all(scopes.map((scope) => pollPermissionState(db, address, scope)))
  })

  afterEach(async function () {
    const db = container.resolve(Database)
    await db.delete('permission', {})
  })
}
