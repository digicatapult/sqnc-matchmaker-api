import { UUID } from './uuid'

/**
 * The possible states of a chain transaction
 */
export type TransactionState = 'submitted' | 'inBlock' | 'finalised' | 'failed'

/**
 * A transaction returned by the API
 */
export interface TransactionResponse {
  id: UUID
  state: TransactionState
  apiType: TransactionApiType
  transactionType: TransactionType
  submittedAt: Date
  updatedAt: Date
}

/**
 * The type of the entity involved in the transaction
 */
export type TransactionApiType = 'match2' | 'order' | 'capacity'

/**
 * Transaction type - matches the endpoint that initiates the transaction
 */
export type TransactionType = 'creation' | 'proposal' | 'accept'
