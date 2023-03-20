// a temporary placeholder for the blockchain watcher

import { UUID } from '../../models/uuid'
import { TransactionStatus } from '../../models/transaction'
import { TokenType } from '../../models/tokenType'
import Database from '../db'

export const observeNewToken = async (db: Database, tokenType: TokenType, transactionId: UUID, tokenId: number) => {
  const [{ localId }] = await db.updateTransaction(transactionId, {
    status: TransactionStatus.finalised,
    token_id: tokenId,
  })

  await db.updateLocalWithTokenId(tokenType, localId, tokenId)
}
