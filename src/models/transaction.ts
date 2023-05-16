import { UUID } from './strings'

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
export type TransactionApiType = 'match2' | 'demand_a' | 'demand_b'

/**
 * Transaction type - matches the endpoint that initiates the transaction
 */
export type TransactionType = 'creation' | 'proposal' | 'accept' | 'comment' | 'rejection'
