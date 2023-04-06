import { Logger } from 'pino'

import type Database from '../db/index'
import ChainNode from '../chainNode'

export type BlockHandler = (blockHash: string) => Promise<void>

export interface IndexerCtorArgs {
  db: Database
  logger: Logger
  node: ChainNode
  handleBlock: BlockHandler
  retryDelay?: number
}

export default class Indexer {
  private logger: Logger
  private db: Database
  private node: ChainNode
  private gen: AsyncGenerator<string | null, void, string>
  private handleBlock: BlockHandler
  private unprocessedBlocks: string[]
  private retryDelay: number

  constructor({ db, logger, node, handleBlock, retryDelay }: IndexerCtorArgs) {
    this.logger = logger.child({ module: 'indexer' })
    this.db = db
    this.node = node
    this.gen = this.nextBlockProcessor()
    this.unprocessedBlocks = []
    this.handleBlock = handleBlock
    this.retryDelay = retryDelay || 1000
  }

  public async start() {
    this.logger.info('Starting Block Indexer')

    // get the latest finalised hash
    const latestFinalisedHash = await this.node.getLastFinalisedBlockHash()
    // update the internal generator state and wait for that to finish
    const lastProcessedHash = await this.processNextBlock(latestFinalisedHash)

    // this.state = 'started'
    this.logger.info('Block Indexer Started')

    return lastProcessedHash
  }

  public async close() {
    this.logger.info('Closing Block Indexer')
    await this.gen.return()
    // this.state = 'stopped'
    this.logger.info('Block Indexer Closed')
  }

  public async processAllBlocks(latestFinalisedHash: string) {
    let done = false
    let lastBlockProcessed: string | null = null
    do {
      const result = await this.gen.next(latestFinalisedHash)
      if (result.value !== null && result.value) {
        lastBlockProcessed = result.value
      }
      done = result.done || result.value === null
    } while (!done)

    return lastBlockProcessed
  }

  public async processNextBlock(latestFinalisedHash: string): Promise<string | null> {
    const result = await this.gen.next(latestFinalisedHash)
    return result.value || null
  }

  // async generator that gets the next finalised block and processes it with the provided handler
  // takes the last processed block hash
  // yields the hash of the processed block
  // main benefit of using a generator is it funnels all triggers from any source into a single
  // serialised async flow
  private async *nextBlockProcessor(): AsyncGenerator<string | null, void, string> {
    const lastProcessedBlock = await this.db.getLastProcessedBlock()
    this.unprocessedBlocks = [lastProcessedBlock?.hash].filter((x): x is string => !!x)

    const loopFn = async (lastKnownFinalised: string): Promise<void> => {
      try {
        const lastProcessedBlock = await this.db.getLastProcessedBlock()
        this.logger.debug('Last processed block: %s', lastProcessedBlock?.hash)

        await this.updateUnprocessedBlocks(lastProcessedBlock?.hash || null, lastKnownFinalised)

        if (this.unprocessedBlocks.length !== 0) {
          await this.handleBlock(this.unprocessedBlocks[0])
        }
      } catch (err) {
        const asError = err as Error | null
        this.logger.warn('Unexpected error indexing blocks. Error was %s. Retrying...', asError?.message)
        return new Promise((r) => {
          setTimeout(() => {
            loopFn(lastKnownFinalised).then(r)
          }, this.retryDelay)
        })
      }
    }

    while (true) {
      const lastKnownFinalised = yield this.unprocessedBlocks.shift() || null
      await loopFn(lastKnownFinalised)
    }
  }

  private async updateUnprocessedBlocks(lastProcessedHash: string | null, lastFinalisedHash: string): Promise<void> {
    this.logger.debug('Updating list of finalised blocks to be processed')

    // remove elements up to and including out lastProcessedHash if it's in the unprocessedBlocks array
    // this can happen if another instance is also processing blocks
    if (lastProcessedHash !== null) {
      const lastProcessedHashIndex = this.unprocessedBlocks.indexOf(lastProcessedHash)
      if (lastProcessedHashIndex !== -1) {
        this.unprocessedBlocks.splice(0, lastProcessedHashIndex + 1)
      }
    }

    // find the earliest hash we know about. This is either the last process hash or the last element in the unprocessedBlocks array
    // if we have lots of blocks to process still
    const lastKnownHash = this.unprocessedBlocks.at(-1) || lastProcessedHash
    const [{ height: lastKnownIndex }, { height: lastFinalisedIndex }] = await Promise.all([
      lastKnownHash !== null ? this.node.getHeader(lastKnownHash) : Promise.resolve({ height: 0 }),
      this.node.getHeader(lastFinalisedHash),
    ])

    // if we know about all the blocks then noop
    // note we allow the finalised block to go backwards so if the node we're talking to isn't up to date
    // things still to proceed
    if (lastFinalisedIndex <= lastKnownIndex) {
      return
    }

    // get the new hashes based on the difference in block height
    const newHashes = [lastFinalisedHash]
    for (let i = lastFinalisedIndex; i > lastKnownIndex + 1; i--) {
      const lastChild = await this.node.getHeader(newHashes.at(-1) as string)
      newHashes.push(lastChild.parent)
    }

    // sanity check that the parent of lastKnown index is indeed what we expect. If not we have a major problem
    if (lastKnownHash !== null && (await this.node.getHeader(newHashes.at(-1) as string)).parent !== lastKnownHash) {
      throw new Error()
    }

    this.unprocessedBlocks = this.unprocessedBlocks.concat(newHashes.reverse())

    this.logger.debug(`Found ${this.unprocessedBlocks.length} blocks to be processed`)
    this.logger.trace('Blocks to be processed: %j', this.unprocessedBlocks)
  }
}
