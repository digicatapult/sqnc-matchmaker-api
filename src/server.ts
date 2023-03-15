import express, { Express } from 'express'
import { setup, serve } from 'swagger-ui-express'

import cors from 'cors'
import { json } from 'body-parser'
import { errorHandler } from './lib/error-handler'

import { RegisterRoutes } from './routes'
import * as swaggerJson from './swagger.json'

// TODO review this any
export default async (): Promise<Express> => {
  const app: Express = express()


  RegisterRoutes(app)
  app.use(json())
  app.use(cors())
  app.use(errorHandler)
  app.use(['/swagger'], serve, setup(swaggerJson))

  return app
}
