import { Controller, Get, Route, Path, Response, Tags, Security, Query } from 'tsoa'
import type { Logger } from 'pino'

import { LoggerToken } from '../../../lib/logger.js'
import Database from '../../../lib/db/index.js'
import type { DATE, UUID } from '../../../models/strings.js'
import { BadRequest, NotFound } from '../../../lib/error-handler/index.js'
import { type TransactionApiType, type TransactionState, TransactionResponse } from '../../../models/transaction.js'
import { parseDateParam } from '../../../lib/utils/queryParams.js'
import { inject, injectable } from 'tsyringe'

@Route('v1/transaction')
@Tags('transaction')
@Security('oauth2')
@injectable()
export class TransactionController extends Controller {
  log: Logger
  db: Database

  constructor(db: Database, @inject(LoggerToken) logger: Logger) {
    super()
    this.log = logger.child({ controller: '/transaction' })
    this.db = db
  }

  /**
   * Returns the details of all transactions.
   * @summary List transactions
   * @Query apiType lists all transactions by that type
   */
  @Response<BadRequest>(400, 'Request was invalid')
  @Response<NotFound>(404, 'Item not found')
  @Security('oauth2')
  @Get('/')
  public async getAllTransactions(
    @Query() apiType?: TransactionApiType,
    @Query() status?: TransactionState,
    @Query() updated_since?: DATE
  ): Promise<TransactionResponse[]> {
    const query: { state?: TransactionState; apiType?: TransactionApiType; updatedSince?: Date } = {
      state: status,
      apiType,
    }
    if (updated_since) {
      query.updatedSince = parseDateParam(updated_since)
    }

    return await this.db.getTransactions(query)
  }

  /**
   * @summary Get a transaction by ID
   * @param transactionId The transactions's identifier
   */
  @Response<NotFound>(404, 'Item not found')
  @Security('oauth2')
  @Get('{transactionId}')
  public async getTransaction(@Path() transactionId: UUID): Promise<TransactionResponse> {
    const [transaction] = await this.db.getTransaction(transactionId)
    if (!transaction) throw new NotFound('transaction')

    return transaction
  }
}
