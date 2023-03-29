import { UUID } from './uuid'

/**
 * The possible states of a chain transaction
 */
export enum TransactionState {
  submitted = 'submitted',
  inBlock = 'inBlock',
  finalised = 'finalised',
  failed = 'failed',
}

/**
 * A transaction returned by the API
 */
export interface TransactionResponse {
  id: UUID
  state: TransactionState
  submittedAt: Date
  updatedAt: Date
}
