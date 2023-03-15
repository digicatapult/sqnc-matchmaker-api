import { Response as ExResponse, Request as ExRequest, NextFunction } from 'express'
import { ValidateError } from 'tsoa'

import { logger } from '../logger'

/**
 * this should reflect database tables
 */
type Entities = 'attachments' // add as needed

interface INotFound {
  status: number
  message?: string
  item: Entities
  name: string
}

interface IBadRequest {
  status: number
  message?: string
  name: string
}

/**
 * reports that item was not found
 */
export class NotFound extends Error implements INotFound {
  public item: Entities
  public status = 404

  constructor(item: Entities, message?: string) {
    super(message)
    this.item = item
    this.name = 'not found'
    // this.stack = (<any> new Error()).stack
  }
}

/**
 * indicates that request was invalid e.g. missing parameter
 */
export class BadRequst extends Error implements IBadRequest {
  public status = 400

  constructor(message?: string | undefined) {
    super(message)
    this.name = 'bad request'
    // this.stack = (<any> new Error()).stack
  }
}

export const errorHandler = function errorHandler(
  err: unknown,
  req: ExRequest,
  res: ExResponse,
  next: NextFunction
): ExResponse | void {
  if (err instanceof ValidateError) {
    logger.error(`Handled Validation Error for ${req.path}:`, err.fields)

    return res.send(err)
  }
  if (err instanceof Error) {
    logger.error('Unexpected error thrown in handler: %s', err.message)

    return res.status(500).json(err)
  }

  next()
}
