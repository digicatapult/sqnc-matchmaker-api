import { describe, before, it } from 'mocha'
import type { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server.js'
import { get } from '../../helper/routeHelper.js'

describe('swagger', () => {
  let app: Express

  before(async function () {
    app = await createHttpServer()
  })

  it('/swagger should return 200', async () => {
    const response = await get(app, '/swagger/')
    expect(response.status).to.equal(200)
  })

  it('/api-doc should return 200', async () => {
    const response = await get(app, '/api-docs')
    expect(response.status).to.equal(200)
  })

  it('/api-docs should return json with correct open-api version', async () => {
    const response = await get(app, '/api-docs')
    const body = await response.body
    expect(body?.openapi).to.equal('3.0.0')
  })
})
