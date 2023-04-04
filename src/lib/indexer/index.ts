import { Logger } from 'pino'

import type Database from '../db/index.js'
import ChainNode from '../chainNode.js'

export interface IndexerCtorArgs {
  db: Database
  logger: Logger
  node: ChainNode
}

export default class Indexer {
  private logger: Logger
  private db: Database
  private node: ChainNode
  private gen: AsyncGenerator<string | null, void, string>
  private unprocessedBlocks: string[]

  constructor({ db, logger, node }: IndexerCtorArgs) {
    this.logger = logger.child({ module: 'indexer' })
    this.db = db
    this.node = node
    this.gen = this.nextBlockProcessor()
    this.unprocessedBlocks = []
  }

  public async start() {
    this.logger.info('Starting Block Indexer')

    // get the latest finalised hash
    const latestFinalisedHash = await this.node.getLastFinalisedBlockHash()
    // update the internal generator state and wait for that to finish
    await this.processNextBlock(latestFinalisedHash)
    // trigger processing all remaining blocks in the background
    this.processAllBlocks(latestFinalisedHash)

    this.logger.info('Block Indexer Started')
  }

  public async close() {
    this.logger.info('Closing Block Indexer')
    await this.gen.return()
    this.logger.info('Block Indexer Closed')
  }

  public async processAllBlocks(latestFinalisedHash: string) {
    let done = false
    do {
      const result = await this.gen.next(latestFinalisedHash)
      done = result.done || result.value === null
    } while (!done)
  }

  public async processNextBlock(latestFinalisedHash: string): Promise<string | null> {
    const result = await this.gen.next(latestFinalisedHash)
    return result.value || null
  }

  // async generator that gets the next finalised block and processes it with the provided handler
  // takes the last processed block hash
  // yields the hash of the processed block
  private async *nextBlockProcessor(): AsyncGenerator<string | null, void, string> {
    const lastProcessedBlock = await this.db.getLastProcessedBlock()
    this.unprocessedBlocks = [lastProcessedBlock?.hash].filter((x): x is string => !!x)

    while (true) {
      const lastKnownFinalised = yield this.unprocessedBlocks.shift() || null

      const lastProcessedBlock = await this.db.getLastProcessedBlock()
      this.logger.debug('Last processed block: %s', lastProcessedBlock?.hash)

      this.updateUnprocessedBlocks(lastProcessedBlock?.hash || null, lastKnownFinalised)

      if (this.unprocessedBlocks.length !== 0) {
        await this.handleBlock(this.unprocessedBlocks[0])
      }
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

    // do we already know about the lastFinalisedHash. If so noop
    if (this.unprocessedBlocks.indexOf(lastFinalisedHash) !== -1) {
      return
    }

    // find the earliest hash we know about. This is either the last process hash or the last element in the unprocessedBlocks array
    // if we have lots of blocks to process still
    const lastKnownHash = this.unprocessedBlocks.at(-1) || lastProcessedHash
    const [{ height: lastKnownIndex }, { height: lastFinalisedIndex }] = await Promise.all([
      lastKnownHash !== null ? this.node.getHeader(lastKnownHash) : Promise.resolve({ height: 0 }),
      this.node.getHeader(lastFinalisedHash),
    ])

    // sanity check that block height is increasing. If not we have a major problem
    if (lastFinalisedIndex < lastKnownIndex) {
      throw new Error()
    }

    // get the new hashes based on the difference in block height
    const newHashes = [lastFinalisedHash]
    for (let i = lastFinalisedIndex; i > lastKnownIndex; i--) {
      const lastChild = await this.node.getHeader(newHashes.at(-1) as string)
      newHashes.push(lastChild.parent)
    }

    // sanity check that the parent of lastKnown index is indeed what we expect. If not we have a major problem
    if ((await this.node.getHeader(newHashes.at(-1) as string)).parent !== lastKnownHash) {
      throw new Error()
    }

    this.unprocessedBlocks = this.unprocessedBlocks.concat(newHashes.reverse())

    this.logger.debug(`Found ${this.unprocessedBlocks.length} blocks to be processed`)
    this.logger.trace('Blocks to be processed: %j', this.unprocessedBlocks)
  }

  private async handleBlock(blockHash: string): Promise<void> {
    this.logger.debug(`Processing block ${blockHash}`)
    return Promise.resolve()
  }
}
