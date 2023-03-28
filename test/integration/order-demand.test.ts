/* eslint disable */
import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { post } from '../helper/routeHelper'
import { seed, cleanup, parametersAttachmentId } from '../seeds'

import { DemandState } from '../../src/models/demand'
import { selfAlias, identitySelfMock } from '../helper/mock'

// const db = new Database()

describe.only('order', () => {
  let res: any
  let app: Express

  before(async function () {
    app = await createHttpServer()
    identitySelfMock()
  })

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('if attachment can not be found', () => {
    beforeEach(async () => {
      res = await post(app, '/order', { parametersAttachmentId: 'a789ad47-91c3-446e-90f9-a7c9b233ea88' })
    })

    it('returns 404 along with the message', () => {
      const { status, body } = res

      expect(status).to.equal(404)
      expect(body).to.equal('attachment not found')
    })
  })

  describe('if invalid attachment uuid', () => {
    beforeEach(async () => {
      res = await post(app, '/order', { parametersAttachmentId: 'a789ad47' })
    })

    it('returns 422 along with validation error', () => {
      const { status, body } = res
      console.log({ status, body: body.fields })

      expect(status).to.equal(422)
      expect(body).to.deep.contain({
        fields: { '.parametersAttachmentId': {
          message: "Not match in '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}'",
          value: "a789ad47",
         } },
        name: 'ValidationError',
        message: 'validation failed',
      })
    })
  })


  it('should create a order demand', async () => {
    const response = await post(app, '/order', { parametersAttachmentId })
    const { id: responseId, ...responseRest } = response.body

    expect(response.status).to.equal(201)
    expect(responseId).to.match(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    )
    expect(responseRest).to.deep.equal({
      parametersAttachmentId,
      state: DemandState.created,
      owner: selfAlias,
    })
  })
})
