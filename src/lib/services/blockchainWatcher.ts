// a temporary placeholder for the blockchain watcher

import { UUID } from '../../models/uuid'
import { TokenType } from '../../models/tokenType'
import Database from '../db'
import { DemandState, Match2State } from '../../models'

const db = new Database()

const typeTableMap = {
  [TokenType.DEMAND]: 'demand',
  [TokenType.MATCH2]: 'match2',
}

export const observeTokenId = async (
  tokenType: TokenType,
  localId: UUID,
  state: DemandState | Match2State,
  tokenId: number,
  isNewEntity: boolean
) => {
  await db.updateLocalWithTokenId(typeTableMap[tokenType], localId, state, tokenId, isNewEntity)
}
