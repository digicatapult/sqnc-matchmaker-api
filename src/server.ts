import express, { Express } from 'express'
import { setup, serve } from 'swagger-ui-express'

import cors from 'cors'
import { json, urlencoded } from 'body-parser'
import { errorHandler } from './lib/error-handler'
import { RegisterRoutes } from './routes'
import * as swaggerJson from './swagger.json'
import multer from 'multer'

export default async (): Promise<Express> => {
  const app: Express = express()

  app.use(urlencoded({ extended: true }))
  app.use(json())
  app.use(cors())

  RegisterRoutes(app)
  app.use(errorHandler)
  app.use(['/swagger'], serve, setup(swaggerJson))

  // Currently only set to test function
  app.post(
    '/attachment/uploadfile',
    multer({ limits: { fileSize: 1 * 1024 * 1024 }, storage: multer.diskStorage({}) }).single('file'),
    (req, res, next) => {
      const file = req.file
      if (!file) {
        const error = new Error('Please upload a file')
        return next(error)
      }
      res.send(file)
    }
  )

  return app
}
