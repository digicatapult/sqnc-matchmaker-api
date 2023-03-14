import { Response as ExResponse, Request as ExRequest, NextFunction } from 'express'
import { ValidateError } from 'tsoa'

import { logger } from '../logger'
export interface ValidateErrorJSON {
  message: 'Validation failed'
  details: { [name: string]: unknown }
}

export class HttpResponseError extends Error {
  public code: number
  public message: string

  constructor({ code = 500, message = 'Internal server error' }) {
    super(message)
    this.code = code
    this.message = message
  }
}

export class BadRequestError extends HttpResponseError {
  constructor(message: string) {
    super({ code: 400, message: `Bad Request: ${message}` })
  }
}

export class NotFoundError extends HttpResponseError {
  constructor(message: string) {
    super({ code: 404, message: `Not Found: ${message}` })
  }
}

export const errorHandler = function errorHandler(
  err: unknown,
  req: ExRequest,
  res: ExResponse,
  next: NextFunction
): ExResponse | void {
  if (err instanceof ValidateError) {
    logger.debug(`Handled Validation Error for ${req.path}:`, err.fields)
    const response: ValidateErrorJSON = {
      message: 'Validation failed',
      details: err?.fields,
    }
    return res.status(422).json(response)
  }
  if (err instanceof HttpResponseError) {
    logger.debug(`Bad request for ${req.path}`)
    return res.status(err.code).json(err.message)
  }

  if (err instanceof Error) {
    logger.warn('Unexpected error thrown in handler: %s', err.message)
    return res.status(500).json({
      message: 'Internal Server Error',
    })
  }

  next()
}
