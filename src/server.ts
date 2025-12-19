import type { Express } from 'express'
import express from 'express'
import type { SwaggerUiOptions } from 'swagger-ui-express'
import { setup, serve } from 'swagger-ui-express'
import cors from 'cors'
import promBundle from 'express-prom-bundle'

import { errorHandler } from './lib/error-handler/index.js'
import { RegisterRoutes } from './routes.js'
import loadApiSpec from './swagger.js'
import { type Env, EnvToken } from './env.js'
import { container } from 'tsyringe'

const promClient = promBundle({
  includePath: true,
  promClient: {
    collectDefaultMetrics: {
      prefix: 'sqnc_matchmaker_api_',
    },
  },
})

export default async (): Promise<Express> => {
  const app: Express = express()

  const env = container.resolve<Env>(EnvToken)
  const API_SWAGGER_BG_COLOR = env.API_SWAGGER_BG_COLOR
  const API_SWAGGER_TITLE = env.API_SWAGGER_TITLE

  const customCssToInject: string = `
    body { background-color: ${API_SWAGGER_BG_COLOR}; }
    .swagger-ui .scheme-container { background-color: inherit; }
    .swagger-ui .opblock .opblock-section-header { background: inherit; }
    .topbar { display: none; }
    .swagger-ui .btn.authorize { background-color: #f7f7f7; }
    .swagger-ui .opblock.opblock-post { background: rgba(73,204,144,.3); }
    .swagger-ui .opblock.opblock-get { background: rgba(97,175,254,.3); }
    .swagger-ui .opblock.opblock-put { background: rgba(252,161,48,.3); }
    .swagger-ui .opblock.opblock-delete { background: rgba(249,62,62,.3); }
    .swagger-ui section.models { background-color: #f7f7f7; }
  `

  const options: SwaggerUiOptions = {
    swaggerOptions: { url: '/api-docs', oauth: { clientId: env.IDP_CLIENT_ID } },
    customCss: customCssToInject,
    customSiteTitle: API_SWAGGER_TITLE,
  }

  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  app.use(cors())
  app.use(promClient)

  const apiSpec = await loadApiSpec(env)
  app.get('/api-docs', (_req, res) => {
    res.json(apiSpec)
  })
  app.use('/swagger', serve, setup(undefined, options))

  RegisterRoutes(app)

  app.use(errorHandler)

  return app
}
