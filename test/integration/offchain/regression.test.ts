import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server'
import { post } from '../../helper/routeHelper'
import { seed, cleanup, parametersAttachmentId } from '../../seeds'
import { selfAddress, withIdentityNullSelf } from '../../helper/mock'

describe('transaction', () => {
  let app: Express

  before(async function () {
    app = await createHttpServer()
  })

  withIdentityNullSelf()

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('identity', () => {
    it.only('should use chain address as an alias if no alias is set', async () => {
      const {
        status,
        body: { owner },
      } = await post(app, '/capacity', { parametersAttachmentId })
      expect(status).to.equal(201)
      expect(owner).to.equal(selfAddress)
    })
  })
})
