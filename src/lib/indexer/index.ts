import { Logger } from 'pino'

import type Database from '../db/index.js'

export interface IndexerCtorArgs {
  db: Database
  logger: Logger
}

export default class Indexer {
  private log: Logger
  private db: Database
  private gen: AsyncGenerator

  constructor({ db, logger }: IndexerCtorArgs) {
    this.log = logger.child({ module: 'indexer' })
    this.db = db
    this.gen = this.processBlocks()
  }

  public async start() {
    this.log.info('Starting Block Indexer')
    await this.gen.next()
    this.log.info('Block Indexer Started')
  }

  public async close() {
    this.log.info('Closing Block Indexer')
    await this.gen.return(null)
    this.log.info('Block Indexer Closed')
  }

  private async *processBlocks() {
    while (true) {
      // get last processed block from the db
      const lastProcessedBlock = await this.db.getLastProcessedBlock()
      this.log.debug('Last processed block: %s', lastProcessedBlock?.hash)

      // get latest finalised block
      // iterate from latest head back to lastProcessedBlock
      // loop on new blocks in order oldest -> newest
      //    process block into a series of database transactionalisable inserts/updates
      //    update db in a tx. Log (debug on failure).
      // yield
      yield
    }
  }
}
