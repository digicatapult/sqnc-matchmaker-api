import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../../src/server.js'
import { post, get } from '../../helper/routeHelper.js'
import {
  cleanup,
  demandSeed,
  parametersAttachmentId,
  exampleDate,
  seededDemandAId,
  seededDemandBId,
  nonExistentId,
  seededDemandACreationTransactionId,
  seededDemandBCreationTransactionId,
  seededDemandACreationTransactionId2,
  seededDemandBCreationTransactionId2,
  seededDemandACommentTransactionId,
  seededDemandBCommentTransactionId,
  seededDemandACommentTransactionId2,
  seededDemandBCommentTransactionId2,
  seededDemandAAlreadyAllocated,
  seededDemandBAlreadyAllocated,
} from '../../seeds/offchainSeeds/demand.seed.js'

import { proxyAlias, withIdentitySelfMock } from '../../helper/mock.js'
import { assertIsoDate, assertUUID } from '../../helper/assertions.js'

const runDemandTests = (demandType: 'demandA' | 'demandB') => {
  const dbDemandSubtype = demandType === 'demandA' ? 'demand_a' : 'demand_b'
  const seededDemandId = demandType === 'demandA' ? seededDemandAId : seededDemandBId
  const seededCreationTransactionId =
    demandType === 'demandA' ? seededDemandACreationTransactionId : seededDemandBCreationTransactionId
  const seededCreationTransactionId2 =
    demandType === 'demandA' ? seededDemandACreationTransactionId2 : seededDemandBCreationTransactionId2
  const seededCommentTransactionId =
    demandType === 'demandA' ? seededDemandACommentTransactionId : seededDemandBCommentTransactionId
  const seededCommentTransactionId2 =
    demandType === 'demandA' ? seededDemandACommentTransactionId2 : seededDemandBCommentTransactionId2
  const seededDemandAlreadyAllocated =
    demandType === 'demandA' ? seededDemandAAlreadyAllocated : seededDemandBAlreadyAllocated

  describe(demandType, () => {
    let app: Express

    before(async function () {
      app = await createHttpServer()
    })

    withIdentitySelfMock()

    beforeEach(async function () {
      await demandSeed()
    })

    afterEach(async function () {
      await cleanup()
    })

    describe('happy path', () => {
      it(`should create a ${demandType}`, async () => {
        const response = await post(app, `/v1/${demandType}`, { parametersAttachmentId })
        expect(response.status).to.equal(201)

        const { id: responseId, createdAt, updatedAt, ...responseRest } = response.body
        assertUUID(responseId)
        assertIsoDate(createdAt)
        assertIsoDate(updatedAt)
        expect(responseRest).to.deep.equal({
          parametersAttachmentId,
          state: 'pending',
          owner: proxyAlias,
        })
      })

      it(`should get a ${demandType}`, async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}`)
        expect(response.status).to.equal(200)
        expect(response.body).to.deep.equal({
          id: seededDemandId,
          owner: proxyAlias,
          state: 'pending',
          parametersAttachmentId,
          comments: [
            {
              attachmentId: parametersAttachmentId,
              createdAt: exampleDate,
              owner: proxyAlias,
            },
          ],
          createdAt: exampleDate,
          updatedAt: exampleDate,
        })
      })

      it(`should get all ${demandType}s`, async () => {
        const { status, body } = await get(app, `/v1/${demandType}`)
        expect(status).to.equal(200)
        expect(body).to.be.an('array')
        expect(body.find(({ id }: { id: string }) => id === seededDemandId)).to.deep.equal({
          createdAt: exampleDate,
          id: seededDemandId,
          owner: proxyAlias,
          parametersAttachmentId: parametersAttachmentId,
          state: 'pending',
          updatedAt: exampleDate,
        })
      })

      it('should filter based on updated date', async () => {
        const { status, body } = await get(app, `/v1/${demandType}?updated_since=2023-01-01T00:00:00.000Z`)
        expect(status).to.equal(200)
        expect(body).to.deep.equal([])
      })

      it('should get a transaction', async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}/creation/${seededCreationTransactionId}`)
        expect(response.status).to.equal(200)
        expect(response.body).to.deep.equal({
          id: seededCreationTransactionId,
          apiType: dbDemandSubtype,
          transactionType: 'creation',
          localId: seededDemandId,
          state: 'submitted',
          submittedAt: exampleDate,
          updatedAt: exampleDate,
        })
      })

      it(`should get all creation transactions from a ${demandType} ID - 200`, async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}/creation`)
        expect(response.status).to.equal(200)
        expect(response.body).to.deep.equal([
          {
            id: seededCreationTransactionId,
            apiType: dbDemandSubtype,
            transactionType: 'creation',
            localId: seededDemandId,
            state: 'submitted',
            submittedAt: exampleDate,
            updatedAt: exampleDate,
          },
          {
            id: seededCreationTransactionId2,
            apiType: dbDemandSubtype,
            transactionType: 'creation',
            localId: seededDemandId,
            state: 'submitted',
            submittedAt: exampleDate,
            updatedAt: exampleDate,
          },
        ])
      })

      it(`should get all comment transactions from a ${demandType} ID - 200`, async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}/comment`)
        expect(response.status).to.equal(200)
        expect(response.body).to.deep.equal([
          {
            id: seededCommentTransactionId,
            apiType: dbDemandSubtype,
            transactionType: 'comment',
            localId: seededDemandId,
            state: 'submitted',
            submittedAt: exampleDate,
            updatedAt: exampleDate,
          },
          {
            id: seededCommentTransactionId2,
            apiType: dbDemandSubtype,
            transactionType: 'comment',
            localId: seededDemandId,
            state: 'submitted',
            submittedAt: exampleDate,
            updatedAt: exampleDate,
          },
        ])
      })

      it(`should filter ${demandType} creations based on updated date`, async () => {
        const { status, body } = await get(
          app,
          `/v1/${demandType}/${seededDemandId}/creation?updated_since=2023-01-01T00:00:00.000Z`
        )
        expect(status).to.equal(200)
        expect(body).to.deep.equal([])
      })

      it(`should filter ${demandType} comments based on updated date`, async () => {
        const { status, body } = await get(
          app,
          `/v1/${demandType}/${seededDemandId}/comment?updated_since=2023-01-01T00:00:00.000Z`
        )
        expect(status).to.equal(200)
        expect(body).to.deep.equal([])
      })

      it('should get comment transaction from a tx ID - 200', async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}/comment/${seededCommentTransactionId}`)
        expect(response.status).to.equal(200)
        expect(response.body).to.deep.equal({
          id: seededCommentTransactionId,
          apiType: dbDemandSubtype,
          transactionType: 'comment',
          localId: seededDemandId,
          state: 'submitted',
          submittedAt: exampleDate,
          updatedAt: exampleDate,
        })
      })
    })

    describe('sad path', () => {
      it('if updatedSince is not a date returns 422', async () => {
        const { status, body } = await get(app, `/v1/${demandType}?updated_since=foo`)
        expect(status).to.equal(422)
        expect(body).to.contain({
          name: 'ValidateError',
          message: 'Validation failed',
        })
      })

      it('invalid attachment uuid - 422', async () => {
        const response = await post(app, `/v1/${demandType}`, { parametersAttachmentId: 'invalid' })
        expect(response.status).to.equal(422)
        expect(response.body.message).to.equal('Validation failed')
      })

      it('unauthenticated create demand - 401', async () => {
        const response = await post(
          app,
          `/v1/${demandType}`,
          { parametersAttachmentId },
          { authorization: 'bearer invalid' }
        )
        expect(response.status).to.equal(401)
        expect(response.body.message).to.equal('Forbidden')
      })

      it('non-existent attachment - 400', async () => {
        const response = await post(app, `/v1/${demandType}`, { parametersAttachmentId: nonExistentId })
        expect(response.status).to.equal(400)
        expect(response.body).to.equal('Attachment not found')
      })

      it(`non-existent ${demandType} id - 404`, async () => {
        const response = await get(app, `/v1/${demandType}/${nonExistentId}`)
        expect(response.status).to.equal(404)
      })

      it('unauthenticated get demand - 401', async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}`, { authorization: 'bearer invalid' })
        expect(response.status).to.equal(401)
        expect(response.body.message).to.equal('Forbidden')
      })

      it(`non-existent ${demandType} id when creating on-chain - 404`, async () => {
        const response = await post(app, `/v1/${demandType}/${nonExistentId}/creation`, {})
        expect(response.status).to.equal(404)
      })

      it(`non-existent ${demandType} id when getting creation tx - 404`, async () => {
        const response = await get(app, `/v1/${demandType}/${nonExistentId}/creation`, {})
        expect(response.status).to.equal(404)
      })

      it('unauthenticated get demand creation - 401', async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}/creation`, {
          authorization: 'bearer invalid',
        })
        expect(response.status).to.equal(401)
        expect(response.body.message).to.equal('Forbidden')
      })

      it(`non-existent ${demandType} id when commenting on-chain - 404`, async () => {
        const response = await post(app, `/v1/${demandType}/${nonExistentId}/comment`, {
          attachmentId: parametersAttachmentId,
        })
        expect(response.status).to.equal(404)
      })

      it(`non-existent ${demandType} id when getting comment tx - 404`, async () => {
        const response = await get(app, `/v1/${demandType}/${nonExistentId}/comment`, {})
        expect(response.status).to.equal(404)
      })

      it('unauthenticated list demand comment - 401', async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}/comment`, {
          authorization: 'bearer invalid',
        })
        expect(response.status).to.equal(401)
        expect(response.body.message).to.equal('Forbidden')
      })

      it('non-existent comment id when getting comment tx - 404', async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}/comment/${nonExistentId}`, {})
        expect(response.status).to.equal(404)
      })

      it('unauthenticated get demand comment - 401', async () => {
        const response = await get(
          app,
          `/v1/${demandType}/${seededDemandId}/comment/${seededDemandBCommentTransactionId}`,
          {
            authorization: 'bearer invalid',
          }
        )
        expect(response.status).to.equal(401)
        expect(response.body.message).to.equal('Forbidden')
      })

      it(`${demandType} creations with invalid updatedSince - 422`, async () => {
        const { status, body } = await get(app, `/v1/${demandType}/${seededDemandId}/creation?updated_since=foo`)
        expect(status).to.equal(422)
        expect(body).to.contain({
          name: 'ValidateError',
          message: 'Validation failed',
        })
      })

      it('incorrect state when creating on-chain - 400', async () => {
        const response = await post(app, `/v1/${demandType}/${seededDemandAlreadyAllocated}/creation`, {})
        expect(response.status).to.equal(400)
        expect(response.body).to.equal(`Demand must have state: 'pending'`)
      })

      it('unauthenticated create demand creation - 401', async () => {
        const response = await post(
          app,
          `/v1/${demandType}/${seededDemandId}/creation`,
          {},
          { authorization: 'bearer invalid' }
        )
        expect(response.status).to.equal(401)
        expect(response.body.message).to.equal('Forbidden')
      })

      it('non-existent Creation ID - 404', async () => {
        const response = await get(app, `/v1/${demandType}/${seededDemandId}/creation/${nonExistentId}`)
        expect(response.status).to.equal(404)
      })

      it(`non-existent ${demandType} ID when using a Creation ID - 404`, async () => {
        const response = await get(app, `/v1/${demandType}/${nonExistentId}/creation/${seededCreationTransactionId}`)
        expect(response.status).to.equal(404)
      })

      it(`non-existent ${demandType} ID should return nothing - 404`, async () => {
        const response = await get(app, `/v1/${demandType}/${nonExistentId}/creation/`)
        expect(response.status).to.equal(404)
      })
    })
  })
}

runDemandTests('demandA')
runDemandTests('demandB')
