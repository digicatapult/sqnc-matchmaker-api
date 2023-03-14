import { describe, before, test } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'
import createHttpServer from '../../src/server'
import { get } from '../routerHelper'

describe('health check', () => {
  let app: Express

  before(async function () {
    app = await createHttpServer()
  })

  test('should return 200', async () => {
    const response = await get(app, '/health')

    expect(response.status).to.equal(200)
  })
})
