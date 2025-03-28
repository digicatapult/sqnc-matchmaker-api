import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Env } from './env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Monkey-patch the generated swagger JSON so that when it is valid for the deployed environment.
 * Note this only effects the api-doc and not the functionality of the service
 * @param env Environment containing configuration for monkey-patching the swagger
 * @returns OpenAPI spec object
 */
export default async function loadApiSpec(env: Env): Promise<unknown> {
  const API_SWAGGER_HEADING = env.API_SWAGGER_HEADING

  const swaggerBuffer = await fs.readFile(path.join(__dirname, './swagger.json'))
  const swaggerJson = JSON.parse(swaggerBuffer.toString('utf8'))
  swaggerJson.info.title += `:${API_SWAGGER_HEADING}`

  const tokenUrlOauth = `${env.IDP_PUBLIC_ORIGIN}${env.IDP_PATH_PREFIX}/realms/${env.IDP_OAUTH2_REALM}/protocol/openid-connect/token`
  swaggerJson.components.securitySchemes.oauth2.flows.clientCredentials.tokenUrl = tokenUrlOauth
  swaggerJson.components.securitySchemes.oauth2.flows.clientCredentials.refreshUrl = tokenUrlOauth

  return swaggerJson
}
