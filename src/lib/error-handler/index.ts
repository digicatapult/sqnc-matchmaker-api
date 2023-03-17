import { Response as ExResponse, Request as ExRequest, NextFunction } from 'express'
import { ValidateError } from 'tsoa'

import { logger } from '../logger'

/**
 * this should reflect database tables
 */
type Entities = 'attachment' | 'demand' | 'capacity' | 'identity' // add as needed

interface INotFound {
  message?: string
  item: Entities
  name: string
}

interface IBadRequest {
  message?: string
  name: string
}

export class HttpResponse extends Error {
  public code: number
  public message: string

  constructor({ code = 500, message = 'Internal server error' }) {
    super(message)
    this.code = code
    this.message = message
  }
}

/**
 * reports that item was not found
 */
export class NotFound extends HttpResponse implements INotFound {
  public item: Entities

  constructor(item: Entities) {
    super({ code: 404, message: `${item} not found` })
    this.item = item
    this.name = 'not found'
    // this.stack = (<any> new Error()).stack
  }
}

/**
 * indicates that request was invalid e.g. missing parameter
 */
export class BadRequest extends HttpResponse implements IBadRequest {
  constructor(message = 'bad request') {
    super({ code: 400, message })
    // this.stack = (<any> new Error()).stack
  }
}

export const errorHandler = function errorHandler(
  err: Error & { code: number },
  req: ExRequest,
  res: ExResponse,
  next: NextFunction
): ExResponse | void {
  if (err instanceof ValidateError) {
    logger.error(`Handled Validation Error for ${req.path}:`, err.fields)

    return res.status(422).send({
      ...err,
      message: 'Validation failed',
    })
  }
  if (err instanceof HttpResponse) {
    logger.error('Unexpected error thrown in handler: %s', err.message)

    return res.status(err.code).json(err.message)
  }
  if (err instanceof Error) {
    logger.error('Unexpected error thrown in handler: %s', err.message)

    return res.status(500).json(err)
  }

  next()
}
