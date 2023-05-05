import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server'
import { post, get } from '../../helper/routeHelper'
import {
  seed,
  parametersAttachmentId,
  seededDemandAId,
  seededDemandACreationId,
  cleanup,
  exampleDate,
} from '../../seeds'

import { selfAlias, withIdentitySelfMock } from '../../helper/mock'
import Database from '../../../src/lib/db'
import { assertIsoDate, assertUUID } from '../../helper/assertions'

const db = new Database()

describe('demandA', () => {
  let res: any
  let app: Express

  before(async function () {
    app = await createHttpServer()
  })

  withIdentitySelfMock()

  beforeEach(async () => await seed())

  describe('when requested demandA or demandAs do not exist', () => {
    beforeEach(async () => await cleanup())

    it('returns 200 and an empty array when retrieving all', async () => {
      const { status, body } = await get(app, '/v1/demandA')

      expect(status).to.equal(200)
      expect(body).to.be.an('array').that.is.empty
    })

    it('returns 404 if can not be found by ID', async () => {
      const { status, body } = await get(app, '/v1/demandA/807d1184-9670-4fb0-bb33-28582e5467b2')

      expect(status).to.equal(404)
      expect(body).to.equal('demandA not found')
    })
    // TODO - assert for max number of records
  })

  describe('if updatedSince is not a date', () => {
    it('returns 422', async () => {
      const { status, body } = await get(app, `/v1/demandA?updatedSince=foo`)
      expect(status).to.equal(422)
      expect(body).to.contain({
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })
  })

  describe('list demandAs', () => {
    it('returns list', async () => {
      const { status, body } = await get(app, `/v1/demandA`)
      expect(status).to.equal(200)
      expect(body).to.be.an('array')
      expect(body.find(({ id }: { id: string }) => id === seededDemandAId)).to.deep.equal({
        createdAt: exampleDate,
        id: seededDemandAId,
        owner: selfAlias,
        parametersAttachmentId: parametersAttachmentId,
        state: 'created',
        updatedAt: exampleDate,
      })
    })

    it('filters based on updated date', async () => {
      const { status, body } = await get(app, `/v1/demandA?updatedSince=2023-01-01T00:00:00.000Z`)
      expect(status).to.equal(200)
      expect(body).to.deep.equal([])
    })
  })

  describe('if attachment can not be found', () => {
    beforeEach(async () => {
      res = await post(app, '/v1/demandA', { parametersAttachmentId: 'a789ad47-91c3-446e-90f9-a7c9b233ea88' })
    })

    it('returns 404 along with the message', () => {
      const { status, body } = res

      expect(status).to.equal(404)
      expect(body).to.equal('attachment not found')
    })
  })

  describe('if invalid demandA uuid', () => {
    beforeEach(async () => {
      res = await get(app, '/v1/demandA/789ad47')
    })

    it('returns 422 along with validation error', async () => {
      const { status, body } = res

      expect(status).to.equal(422)
      expect(body).to.deep.contain({
        fields: {
          demandAId: {
            message:
              "Not match in '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}'",
            value: '789ad47',
          },
        },
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })
  })

  describe('if invalid attachment uuid', () => {
    beforeEach(async () => {
      res = await post(app, '/v1/demandA', { parametersAttachmentId: 'a789ad47' })
    })

    it('returns 422 along with validation error', () => {
      const { status, body } = res

      expect(status).to.equal(422)
      expect(body).to.deep.contain({
        fields: {
          '.parametersAttachmentId': {
            message:
              "Not match in '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}'",
            value: 'a789ad47',
          },
        },
        name: 'ValidateError',
        message: 'Validation failed',
      })
    })
  })

  describe('if demandA state is not created while posting new creation', () => {
    beforeEach(async () => {
      await db.insertDemand({
        id: 'b21f865e-f4e9-4ae2-8944-de691e9eb4d0',
        owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        subtype: 'demand_a',
        state: 'allocated',
        parameters_attachment_id: parametersAttachmentId,
        latest_token_id: 99,
        original_token_id: 99,
      })
    })

    it('returns 400 along with bad request message', async () => {
      const { status, body } = await post(app, '/v1/demandA/b21f865e-f4e9-4ae2-8944-de691e9eb4d0/creation', {})

      expect(status).to.equal(400)
      expect(body).to.equal('Demand must have state: created')
    })
  })

  it('should create an demandA demand', async () => {
    const response = await post(app, '/v1/demandA', { parametersAttachmentId })
    const { id: responseId, createdAt, updatedAt, ...responseRest } = response.body

    expect(response.status).to.equal(201)
    assertUUID(responseId)
    assertIsoDate(createdAt)
    assertIsoDate(updatedAt)
    expect(responseRest).to.deep.equal({
      parametersAttachmentId,
      state: 'created',
      owner: selfAlias,
    })
  })

  it('retrieves demandA creation', async () => {
    const { status, body: creation } = await get(
      app,
      `/v1/demandA/${seededDemandAId}/creation/${seededDemandACreationId}`
    )

    expect(status).to.equal(200)
    expect(creation).to.include.keys(['id', 'localId', 'submittedAt', 'updatedAt'])
    expect(creation).to.contain({
      state: 'submitted',
      apiType: 'demand_a',
      transactionType: 'creation',
    })
  })

  it('retrieves all demandA creations', async () => {
    const { status, body } = await get(app, `/v1/demandA/${seededDemandAId}/creation`)

    expect(status).to.equal(200)
    expect(body[0]).to.deep.contain({
      state: 'submitted',
      localId: seededDemandAId,
      apiType: 'demand_a',
      transactionType: 'creation',
    })
  })

  it('filters demandA creations based on updated date', async () => {
    const { status, body } = await get(
      app,
      `/v1/demandA/${seededDemandAId}/creation?updatedSince=2023-01-01T00:00:00.000Z`
    )
    expect(status).to.equal(200)
    expect(body).to.deep.equal([])
  })

  it('demandA creations with invalid updatedSince returns 422', async () => {
    const { status, body } = await get(app, `/v1/demandA/${seededDemandAId}/creation?updatedSince=foo`)
    expect(status).to.equal(422)
    expect(body).to.contain({
      name: 'ValidateError',
      message: 'Validation failed',
    })
  })
})
