import { UUID } from './uuid'

/**
 * The possible states of a chain transaction
 */
export enum TransactionStatus {
  Submitted = 'Submitted',
  InBlock = 'InBlock',
  Finalised = 'Finalised',
  Failed = 'Failed',
}

/**
 * A transaction returned by the API
 */
export interface TransactionResponse {
  id: UUID
  status: TransactionStatus
  submittedAt: Date
}
