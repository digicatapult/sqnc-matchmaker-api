import express, { Express } from 'express'
import { setup, serve } from 'swagger-ui-express'

import cors from 'cors'
import { json, urlencoded } from 'body-parser'
import { errorHandler } from './lib/error-handler'
import { RegisterRoutes } from './routes'
import * as swaggerJson from './swagger.json'
import { startStatusHandlers } from './lib/ServiceWatcher/serviceStatus/index'
import { serviceState } from './lib/util/statusPoll'

export default async (): Promise<Express> => {
  const app: Express = express()
  const statusHandler = await startStatusHandlers()
  const serviceStatusStrings = {
    [serviceState.UP]: 'ok',
    [serviceState.DOWN]: 'down',
    [serviceState.ERROR]: 'error',
  }
  app.use(urlencoded({ extended: true }))
  app.use(json())
  app.use(cors())

  app.get('/health', async (_req, res) => {
    const status = statusHandler.status
    const details = statusHandler.detail
    const code = status === serviceState.UP ? 200 : 503
    res.status(code).send({
      version: process.env.npm_package_version ? process.env.npm_package_version : 'unknown',
      status: serviceStatusStrings[status] || 'error',
      details: Object.fromEntries(
        Object.entries(details).map(([depName, { status, detail }]) => [
          depName,
          {
            status: serviceStatusStrings[status] || 'error',
            detail,
          },
        ])
      ),
    })
  })

  RegisterRoutes(app)
  app.use(errorHandler)
  app.use(['/swagger'], serve, setup(swaggerJson))

  return app
}
