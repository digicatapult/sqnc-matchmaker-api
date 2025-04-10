import { TransactionRow } from '../lib/db/types.js'
import { TransactionResponse } from '../models/transaction.js'

export const dbTransactionToResponse = (transaction: TransactionRow): TransactionResponse => {
  return {
    id: transaction.id,
    localId: transaction.local_id,
    apiType: transaction.api_type,
    state: transaction.state,
    transactionType: transaction.transaction_type,
    submittedAt: transaction.created_at,
    updatedAt: transaction.updated_at,
  }
}
