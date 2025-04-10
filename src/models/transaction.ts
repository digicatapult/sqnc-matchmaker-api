import { Scope } from './scope.js'
import { UUID } from './strings.js'

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
  localId: UUID
  apiType: TransactionApiType
  transactionType: TransactionType
  submittedAt: Date
  updatedAt: Date
}

/**
 * The type of the entity involved in the transaction
 */
export type TransactionApiType = 'match2' | 'demand_a' | 'demand_b'
export type TransactionScope = Extract<Scope, 'match2:read' | 'demandA:read' | 'demandB:read'>

/**
 * Transaction type - matches the endpoint that initiates the transaction
 */
export type TransactionType = 'creation' | 'proposal' | 'accept' | 'comment' | 'rejection' | 'cancellation'

export const scopeToApiTypeMap: Record<TransactionScope, TransactionApiType> = {
  'match2:read': 'match2',
  'demandA:read': 'demand_a',
  'demandB:read': 'demand_b',
}
