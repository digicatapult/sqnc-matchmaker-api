// a temporary placeholder for the blockchain watcher

import { UUID } from '../../models/uuid'
import { TokenType } from '../../models/tokenType'
import Database from '../db'

const db = new Database()

const typeTableMap = {
  [TokenType.DEMAND]: 'demand',
  [TokenType.MATCH2]: 'match2',
}

export const observeTokenId = async (tokenType: TokenType, localId: UUID, tokenId: number, isNewEntity: boolean) => {
  await db.updateLocalWithTokenId(typeTableMap[tokenType], localId, tokenId, isNewEntity)
}
