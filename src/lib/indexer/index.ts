import { type Logger } from 'pino'

import Database from '../db/index.js'
import ChainNode from '../chainNode.js'
import DefaultBlockHandler from './handleBlock.js'
import { ChangeSet } from './changeSet.js'
import { HEX } from '../../models/strings.js'
import { container, inject, singleton } from 'tsyringe'
import { serviceState, Status } from '../service-watcher/statusPoll.js'
import { type Env, EnvToken } from '../../env.js'
import { LoggerToken } from '../logger.js'
import Attachment from '../services/attachment.js'
import { IndexerDatabaseExtensions } from './indexerDb.js'
import { ProcessedBlockRow } from '../db/types.js'

export type BlockHandler = (blockHash: HEX) => Promise<ChangeSet>

export interface IndexerCtorArgs {
  db: Database
  logger: Logger
  node: ChainNode
  startupTime: Date
  env: Env
  handleBlock?: BlockHandler
  retryDelay?: number
}

export interface BlockProcessingTimes {
  startupTime: Date
  lastProcessedBlockTime: Date | null
  lastUnprocessedBlockTime: Date | null
}

@singleton()
export default class Indexer {
  protected logger: Logger
  private env: Env

  private db: IndexerDatabaseExtensions
  private node: ChainNode
  private attachment: Attachment
  private gen: AsyncGenerator<string | null, void, string>
  private handleBlock: BlockHandler | null = null
  private retryDelay: number
  private startupTime: Date
  private lastProcessedBlockTime: Date | null // while we are running and up to date
  private lastUnprocessedBlockTime: Date | null // only for when we are catching up on unprocessed blocks

  private state: 'created' | 'started' | 'stopped'

  constructor(
    db: IndexerDatabaseExtensions,
    @inject(LoggerToken) logger: Logger,
    node: ChainNode,
    @inject(EnvToken) env: Env,
    attachment: Attachment
  ) {
    this.logger = logger.child({ module: 'indexer' })
    this.env = env
    this.db = db
    this.node = node
    this.attachment = attachment
    this.gen = this.nextBlockProcessor()
    this.state = 'created'
    this.retryDelay = this.env.INDEXER_RETRY_DELAY
    this.lastProcessedBlockTime = null
    this.lastUnprocessedBlockTime = null
    this.startupTime = new Date()

    // Default block handler if no custom one is set
    this.setHandleBlock(new DefaultBlockHandler({ db, node, logger: this.logger }))
  }
  // Setter method to allow updating handleBlock dynamically
  public setHandleBlock(blockHandler: DefaultBlockHandler) {
    this.handleBlock = blockHandler.handleBlock.bind(blockHandler)
    return
  }
  public async start() {
    this.logger.info('Starting Block Indexer')

    if (this.state === 'started') {
      throw new Error('Indexer is already started')
    }

    if (this.state === 'stopped') {
      this.gen = this.nextBlockProcessor()
    }

    // get the latest finalised hash
    const latestFinalisedHash = await this.node.getLastFinalisedBlockHash()
    // update the internal generator state and wait for that to finish
    const lastProcessedHash = await this.processNextBlock(latestFinalisedHash)

    this.state = 'started'
    this.logger.info('Block Indexer Started')

    return lastProcessedHash
  }

  public async close() {
    if (this.state !== 'started') {
      throw new Error('Indexer cannot be stopped when not running')
    }

    this.logger.info('Closing Block Indexer')
    await this.gen.return()
    this.state = 'stopped'
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
  private async *nextBlockProcessor(): AsyncGenerator<string | null, void, HEX> {
    const loopFn = async (lastKnownFinalised: HEX): Promise<HEX | null> => {
      try {
        const lastProcessedBlock = await this.db.getLastProcessedBlock()
        this.logger.debug('Last processed block: %s at height %s', lastProcessedBlock?.hash, lastProcessedBlock?.height)

        // if the finalised block is the same as the last processed block noop
        if (lastProcessedBlock?.hash === lastKnownFinalised) {
          this.logger.debug('Last processed block is last finalised. Database is up to date')
          return null
        }

        await this.updateUnprocessedBlocks(lastProcessedBlock, lastKnownFinalised)
        if (this.lastProcessedBlockTime === null) this.lastProcessedBlockTime = new Date() //once the above method has finished successfully we want to assign a value to lastProcessedBlockTime

        const nextUnprocessedBlockHash = await this.getNextUnprocessedBlockHash(lastProcessedBlock)
        if (nextUnprocessedBlockHash) {
          if (this.handleBlock === null) {
            throw new Error(`Handle Block was not set`)
          }
          const changeSet = await this.handleBlock(nextUnprocessedBlockHash)
          await this.updateDbWithNewBlock(nextUnprocessedBlockHash, changeSet)
          this.lastProcessedBlockTime = new Date()
          return nextUnprocessedBlockHash
        }

        return null
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

    const lastProcessedBlock = await this.db.getLastProcessedBlock()
    let processedBlockHash: HEX | null = lastProcessedBlock?.hash || null
    while (true) {
      const lastKnownFinalised = yield processedBlockHash
      processedBlockHash = await loopFn(lastKnownFinalised)
    }
  }

  private async getNextUnprocessedBlockHash(lastProcessedBlock: ProcessedBlockRow | null): Promise<HEX | null> {
    // get unprocessed block from db with height equal to the lastProcessedBlock height plus 1
    const lastProcessedHeight = lastProcessedBlock ? lastProcessedBlock.height : BigInt(0)
    const nextUnprocessedBlockHeight = lastProcessedHeight + BigInt(1)
    const nextUnprocesedBlock = await this.db.getNextUnprocessedBlockAtHeight(nextUnprocessedBlockHeight)
    return nextUnprocesedBlock?.hash || null
  }

  private async updateUnprocessedBlocks(
    lastProcessedBlock: ProcessedBlockRow | null,
    lastFinalisedHash: HEX
  ): Promise<void> {
    this.logger.debug('Updating list of finalised blocks to be processed')

    // ensure the finalised block is recorded in the db as this will be the latest known unprocessed block in most cases
    // this will mean we have a potential gap between the last finalised block and the last processed block in the db
    const lastProcessedHeight = lastProcessedBlock ? lastProcessedBlock.height : BigInt(0)
    const lastFinalisedBlock = await this.node.getHeader(lastFinalisedHash)
    if (lastFinalisedBlock.height > lastProcessedHeight) {
      this.logger.trace(
        'Asserting unprocessed block %s at height %d',
        lastFinalisedBlock.hash,
        lastFinalisedBlock.height
      )
      await this.db.tryInsertUnprocessedBlock({
        hash: lastFinalisedBlock.hash,
        parent: lastFinalisedBlock.parent,
        height: BigInt(lastFinalisedBlock.height),
      })
    }

    // ensure we do still have an unprocessed block above the last processed. This will definitely be the
    // case if we just inserted a latest finalised and we're up to date. If not though we're likely behind so exit
    const nextRecordedUnprocessedBlock = await this.db.getNextUnprocessedBlockAboveHeight(lastProcessedHeight)
    if (!nextRecordedUnprocessedBlock) {
      return
    }

    // start looping from the beginning of the gap in known unprocessed blocks until the last processed height
    let parentHash = nextRecordedUnprocessedBlock.parent
    for (let height = nextRecordedUnprocessedBlock.height - BigInt(1); height > lastProcessedHeight; height--) {
      const unprocessedBlock = await this.node.getHeader(parentHash)
      this.logger.trace('Asserting unprocessed block %s at height %d', unprocessedBlock.hash, unprocessedBlock.height)
      await this.db.tryInsertUnprocessedBlock({
        hash: unprocessedBlock.hash,
        parent: unprocessedBlock.parent,
        height: BigInt(unprocessedBlock.height),
      })
      this.lastUnprocessedBlockTime = new Date() // time for when we have last leaned about a block
      parentHash = unprocessedBlock.parent
    }
  }

  private async updateDbWithNewBlock(blockHash: HEX, changeSet: ChangeSet): Promise<void> {
    this.logger.debug('Inserting changeset %j for block %s', changeSet, blockHash)
    const header = await this.node.getHeader(blockHash)

    const createdAttachments = new Map<string, string>()
    if (changeSet.attachments) {
      for (const [, attachment] of changeSet.attachments) {
        const { id } = await this.attachment.insertAttachment(attachment.integrityHash, attachment.ownerAddress)
        createdAttachments.set(attachment.id, id)
      }
    }

    const cleanupAttachments = async (error: unknown) => {
      const ids = [...createdAttachments.values()]
      await Promise.allSettled(ids.map((id) => this.attachment.deleteAttachment(id)))
      throw error
    }

    const getAttachmentId = (id: string): string => {
      const attachmentId = createdAttachments.get(id)
      if (!attachmentId) {
        throw new Error(`Attachment id not found for ${id}`)
      }
      return attachmentId
    }

    // prepare the db changes as a transaction
    const dbMutate = this.db.withTransaction(async (db) => {
      if (header.height === 1) {
        await db.insertProcessedBlock({ hash: header.parent, height: BigInt(0), parent: header.parent })
      }
      await db.insertProcessedBlock({ ...header, height: BigInt(header.height) })

      if (changeSet.demands) {
        for (const [, demand] of changeSet.demands) {
          if (demand.type === 'insert') {
            const { type, parameters_attachment_id, ...record } = demand
            await db.insertDemand({
              ...record,
              parameters_attachment_id: getAttachmentId(parameters_attachment_id),
            })
          } else {
            const { type, ...record } = demand
            await db.updateDemand(record.id, record)
          }
        }
      }

      if (changeSet.matches) {
        for (const [, match2] of changeSet.matches) {
          if (match2.type === 'insert') {
            const { type, ...record } = match2
            await db.insertMatch2(record)
          } else {
            const { type, ...record } = match2
            await db.updateMatch2(record.id, record)
          }
        }
      }

      if (changeSet.demandComments) {
        for (const [, comment] of changeSet.demandComments) {
          if (comment.type === 'insert') {
            const { type, attachment_id, ...record } = comment
            await db.insertDemandComment({ ...record, attachment_id: getAttachmentId(attachment_id) })
          } else {
            const { type, ...record } = comment
            await db.updateDemandCommentForTransaction(record.transaction_id, record)
          }
        }
      }
      if (changeSet.match2Comments) {
        for (const [, comment] of changeSet.match2Comments) {
          if (comment.type === 'insert') {
            const { type, attachment_id, ...record } = comment
            await db.insertMatch2Comment({ ...record, attachment_id: getAttachmentId(attachment_id) })
          } else {
            const { type, ...record } = comment
            await db.updateMatch2CommentForTransaction(record.transaction_id, record)
          }
        }
      }
    })

    // Write to the db and on error cleanup attachments
    await dbMutate.catch(cleanupAttachments)
  }

  static async getStatus() {
    const indexer = container.resolve(Indexer)
    return await getStatus(
      indexer.env.INDEXER_TIMEOUT_MS,
      indexer.startupTime,
      indexer.lastProcessedBlockTime,
      indexer.lastUnprocessedBlockTime
    )
  }
}

export const getStatus = async (
  indexerTimeout: number,
  startupTime: Date,
  lastProcessedBlockTime: Date | null,
  lastUnprocessedBlockTime: Date | null
): Promise<Status> => {
  const currentDate = new Date()
  if (currentDate.getTime() - startupTime.getTime() < indexerTimeout) {
    // if we started less than 30s ago -> PASS
    return {
      status: serviceState.UP,
      detail: { message: 'Service healthy. Starting up.', startupTime: startupTime, latestActivityTime: currentDate },
    }
  }
  const latestActivityTime = lastProcessedBlockTime || lastUnprocessedBlockTime
  if (latestActivityTime === null) {
    return {
      status: serviceState.DOWN,
      detail: {
        message: 'Last activity was more than 30s ago, no blocks were processed.',
        startupTime: startupTime,
        latestActivityTime: null,
      },
    }
  }
  if (currentDate.getTime() - latestActivityTime.getTime() < indexerTimeout) {
    return {
      status: serviceState.UP,
      detail: {
        message: 'Service healthy. Running.',
        startupTime: startupTime,
        latestActivityTime: latestActivityTime,
      },
    }
  }
  const errMessage = lastProcessedBlockTime
    ? `Last activity was more than 30s ago. Last processed block at : ${lastProcessedBlockTime}`
    : `Last activity was more than 30s ago. Last learned of block: ${lastUnprocessedBlockTime}`
  return {
    status: serviceState.DOWN,
    detail: { message: errMessage, startupTime: startupTime, latestActivityTime: latestActivityTime },
  }
}
