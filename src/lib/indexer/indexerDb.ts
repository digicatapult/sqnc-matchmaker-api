import { singleton } from 'tsyringe'
import Database from '../db/index.js'
import {
  DemandCommentRow,
  DemandRow,
  InsertDemand,
  InsertDemandComment,
  InsertMatch2,
  InsertMatch2Comment,
  InsertPermissionRow,
  InsertProcessedBlock,
  InsertUnprocessedBlock,
  Match2CommentRow,
  Match2Row,
  ProcessedBlockRow,
  UnprocessedBlockRow,
} from '../db/types.js'
import { HEX, UUID } from '../../models/strings.js'

@singleton()
export class IndexerDatabaseExtensions {
  constructor(private db: Database) {}

  public async findTransaction(callHash: HEX) {
    const transactions = await this.db.get('transaction', { hash: callHash.substring(2) })
    return transactions.length !== 0 ? transactions[0] : null
  }

  public async findLocalIdForToken(tokenId: number): Promise<UUID | null> {
    const result = await Promise.all([
      this.db.get('demand', { latest_token_id: tokenId }),
      this.db.get('match2', { latest_token_id: tokenId }),
      this.db.get('permission', { latest_token_id: tokenId }),
    ])

    return result.flat()[0]?.id || null
  }

  public async getLastProcessedBlock() {
    const blockRecords = await this.db.get('processed_blocks', undefined, [['height', 'desc']], 1)
    return blockRecords.length !== 0 ? this.restore0x(blockRecords[0]) : null
  }

  public async getNextUnprocessedBlockAtHeight(height: bigint) {
    const blockRecords = await this.db.get('unprocessed_blocks', { height })
    return blockRecords.length !== 0 ? this.restore0x(blockRecords[0]) : null
  }

  public async tryInsertUnprocessedBlock(record: InsertUnprocessedBlock) {
    return await this.db.insert('unprocessed_blocks', this.trim0x(record), 'ignore')
  }

  public async getNextUnprocessedBlockAboveHeight(height: bigint) {
    const blockRecords = await this.db.get('unprocessed_blocks', [['height', '>', height]], [['height', 'asc']], 1)
    return blockRecords.length !== 0 ? this.restore0x(blockRecords[0]) : null
  }

  public async insertProcessedBlock(block: InsertProcessedBlock) {
    return await this.db.insert('processed_blocks', this.trim0x(block))
  }

  public async insertPermission(permission: InsertPermissionRow) {
    return await this.db.insert('permission', permission)
  }
  public async deletePermission(id: string) {
    return await this.db.delete('permission', { id })
  }

  public async insertDemand(demand: InsertDemand) {
    return await this.db.insert('demand', demand)
  }

  public async updateDemand(id: string, demand: Partial<DemandRow>) {
    return await this.db.update('demand', { id }, demand)
  }

  public async insertMatch2(match2: InsertMatch2) {
    await this.db.insert('match2', match2)
  }

  public async updateMatch2(id: string, match2: Partial<Match2Row>) {
    return await this.db.update('match2', { id }, match2)
  }

  public async insertDemandComment(demandComment: InsertDemandComment) {
    return await this.db.insert('demand_comment', demandComment)
  }

  public async updateDemandCommentForTransaction(transactionId: string, demandComment: Partial<DemandCommentRow>) {
    return await this.db.update('demand_comment', { transaction_id: transactionId }, demandComment)
  }

  public async insertMatch2Comment(match2Comment: InsertMatch2Comment) {
    return await this.db.insert('match2_comment', match2Comment)
  }

  public async updateMatch2CommentForTransaction(transactionId: string, demandComment: Partial<Match2CommentRow>) {
    return await this.db.update('match2_comment', { transaction_id: transactionId }, demandComment)
  }

  public async withTransaction(update: (db: IndexerDatabaseExtensions) => Promise<void>) {
    return await this.db.withTransaction(async (db) => {
      const ext = new IndexerDatabaseExtensions(db)
      return await update(ext)
    })
  }

  private trim0x(input: InsertUnprocessedBlock | InsertProcessedBlock) {
    return {
      hash: input.hash.startsWith('0x') ? input.hash.slice(2) : input.hash,
      height: input.height,
      parent: input.parent.startsWith('0x') ? input.parent.slice(2) : input.parent,
    }
  }

  private restore0x(input: ProcessedBlockRow | UnprocessedBlockRow) {
    return {
      hash: (input.hash.startsWith('0x') ? input.hash : `0x${input.hash}`) as HEX,
      height: input.height,
      parent: (input.parent.startsWith('0x') ? input.parent : `0x${input.parent}`) as HEX,
      created_at: input.created_at,
    }
  }
}
