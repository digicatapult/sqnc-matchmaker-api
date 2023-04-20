import express, { Express } from 'express'
import { setup, serve } from 'swagger-ui-express'

import cors from 'cors'
import { json, urlencoded } from 'body-parser'
import { errorHandler } from './lib/error-handler'
import { RegisterRoutes } from './routes'
import * as swaggerJson from './swagger.json'

export default async (): Promise<Express> => {
  const app: Express = express()

  app.use(urlencoded({ extended: true }))
  app.use(json())
  app.use(cors())

  RegisterRoutes(app)
  app.use(errorHandler)
  app.use(['/swagger'], serve, setup(swaggerJson))

  return app
}
