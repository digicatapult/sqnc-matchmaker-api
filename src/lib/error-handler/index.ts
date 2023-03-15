import { Response as ExResponse, Request as ExRequest, NextFunction } from 'express'
import { ValidateError } from 'tsoa'

import { logger } from '../logger'

export interface ValidateErrorJSON {
  message: 'Validation failed'
  details: { [name: string]: unknown }
}

type Entities = 'attachments' // add as needed

interface INotFound {
  status: 404
  message?: string
  item: Entities
  name: string
}

interface IBadRequest {
  status: 400
  message?: string
  name: string
}


export class NotFound extends Error implements INotFound{
  public item: Entities
  public status: 404 = 404

  constructor (item: Entities, message?: string) {
      super(message)
      this.item = item
      this.name = 'not found'
      // this.stack = (<any> new Error()).stack
  }
}

export class BadRequst extends Error implements IBadRequest {
  public status: 400 = 400

  constructor (message?: string | undefined) {
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
    logger.debug(`Handled Validation Error for ${req.path}:`, err.fields)
    const response: ValidateErrorJSON = {
      message: 'Validation failed',
      details: err?.fields,
    }
    return res.status(422).json(response)
  }
  if (err instanceof Error) {
    logger.warn('Unexpected error thrown in handler: %s', err.message)
    return res.status(500).json(err)
  }

  next()
}
