import type express from 'express'
import { Controller, Get, Route, Path, Response, Tags, Security, Query, Request } from 'tsoa'
import type { Logger } from 'pino'

import { LoggerToken } from '../../../lib/logger.js'
import Database from '../../../lib/db/index.js'
import type { DATE, UUID } from '../../../models/strings.js'
import { BadRequest, NotFound } from '../../../lib/error-handler/index.js'
import {
  type TransactionApiType,
  type TransactionState,
  scopeToApiTypeMap,
  TransactionResponse,
  TransactionScope,
} from '../../../models/transaction.js'
import { parseDateParam } from '../../../lib/utils/queryParams.js'
import { inject, injectable } from 'tsyringe'
import { OauthError } from '@digicatapult/tsoa-oauth-express'

@Route('v1/transaction')
@Tags('transaction')
@Security('oauth2', ['demandA:read'])
@Security('oauth2', ['demandB:read'])
@Security('oauth2', ['match2:read'])
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
  @Get('/')
  public async getAllTransactions(
    @Request() req: express.Request,
    @Query() apiType?: TransactionApiType,
    @Query() status?: TransactionState,
    @Query() updated_since?: DATE
  ): Promise<TransactionResponse[]> {
    const grantedApiTypes = grantedApiTypesFromScopes(req)

    if (grantedApiTypes.length === 0) throw new OauthError('MISSING_SCOPES')
    if (apiType && !grantedApiTypes.includes(apiType)) throw new OauthError('MISSING_SCOPES')

    const query: { state?: TransactionState; apiTypes?: TransactionApiType[]; updatedSince?: Date } = {
      state: status,
      apiTypes: grantedApiTypes,
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
  @Get('{transactionId}')
  public async getTransaction(
    @Request() req: express.Request,
    @Path() transactionId: UUID
  ): Promise<TransactionResponse> {
    const [transaction] = await this.db.getTransaction(transactionId)
    if (!transaction) throw new NotFound('transaction')

    const grantedApiTypes = grantedApiTypesFromScopes(req)
    if (!grantedApiTypes.includes(transaction.apiType)) throw new OauthError('MISSING_SCOPES')

    return transaction
  }
}

const grantedApiTypesFromScopes = (req: express.Request) => {
  const scopes = req.user?.jwt?.scope?.split(' ') ?? []
  return scopes.reduce<TransactionApiType[]>((acc, scope) => {
    const scopedApiType = scopeToApiTypeMap[scope as TransactionScope]
    return scopedApiType ? [...acc, scopedApiType] : acc
  }, [])
}
