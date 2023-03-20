// a temporary placeholder for the blockchain watcher

import { UUID } from '../../models/uuid'
import { TransactionState } from '../../models/transaction'
import { TokenType } from '../../models/tokenType'
import Database from '../db'

const typeTableMap = {
  [TokenType.DEMAND]: 'demand',
  [TokenType.MATCH2]: 'match2',
}

export const observeTokenId = async (
  db: Database,
  tokenType: TokenType,
  transactionId: UUID,
  tokenId: number,
  isNewEntity: boolean
) => {
  const [{ localId }] = await db.updateTransaction(transactionId, {
    state: TransactionState.finalised,
    token_id: tokenId,
  })

  await db.updateLocalWithTokenId(typeTableMap[tokenType], localId, tokenId, isNewEntity)
}
