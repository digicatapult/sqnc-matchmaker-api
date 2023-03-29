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

export enum TransactionApiType {
  match2 = 'match2',
  order = 'order',
  capacity = 'capacity',
}

export enum TransactionType {
  creation = 'creation',
  proposal = 'proposal',
  accept = 'accept',
}
