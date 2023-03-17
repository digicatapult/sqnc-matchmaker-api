import { UUID } from './uuid'

/**
 * The possible states of a chain transaction
 */
export enum TransactionStatus {
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
  status: TransactionStatus
  submittedAt: Date
}
