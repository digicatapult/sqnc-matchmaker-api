import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { get } from '../helper/routeHelper'
import {
  seed,
  cleanup,
  seededCapacityId,
  nonExistentId,
  seededTransactionId,
  seededTransactionId2,
  seededProposalTransactionId,
  seededMatch2Id,
  exampleDate,
} from '../seeds'
import { TransactionState, TransactionApiType, TransactionType } from '../../src/models/transaction'

describe('transaction', () => {
  let app: Express

  before(async function () {
    app = await createHttpServer()
  })

  beforeEach(async function () {
    await seed()
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('happy path', () => {
    it('it should get a transaction from an id - 200', async () => {
        const response = await get(app, `/transaction/${seededTransactionId}`)
        expect(response.status).to.equal(200)
        expect(response.body).to.deep.equal({
          id: seededTransactionId,
          apiType: TransactionApiType.capacity,
          transactionType: TransactionType.creation,
          localId: seededCapacityId,
          state: TransactionState.submitted,
          submittedAt: exampleDate,
          updatedAt: exampleDate,
        })
      })

      it('it should get all transactions - 200', async () => {
        const response = await get(app, `/transaction/`)
        expect(response.status).to.equal(200)
        expect(response.body).to.deep.equal([
          {
            id: seededTransactionId,
            apiType: TransactionApiType.capacity,
            transactionType: TransactionType.creation,
            localId: seededCapacityId,
            state: TransactionState.submitted,
            submittedAt: exampleDate,
            updatedAt: exampleDate,
          },
          {
            id: seededTransactionId2,
            apiType: TransactionApiType.capacity,
            transactionType: TransactionType.creation,
            localId: seededCapacityId,
            state: TransactionState.submitted,
            submittedAt: exampleDate,
            updatedAt: exampleDate,
          },
          {
            id: seededProposalTransactionId,
            apiType: TransactionApiType.match2,
            transactionType: TransactionType.proposal,
            localId: seededMatch2Id,
            state: TransactionState.submitted,
            submittedAt: exampleDate,
            updatedAt: exampleDate,
          },
        ])
      })

      it('it should get all transactions of an api type - 200', async () => {
        const response = await get(app, `/transaction?apiType=${TransactionApiType.match2}`)
        expect(response.status).to.equal(200)
        expect(response.body).to.deep.equal([
          {
            id: seededProposalTransactionId,
            apiType: TransactionApiType.match2,
            transactionType: TransactionType.proposal,
            localId: seededMatch2Id,
            state: TransactionState.submitted,
            submittedAt: exampleDate,
            updatedAt: exampleDate,
          },
        ])
      })
  })

  describe('sad path', () => {
    it('non-existent transaction id - 404', async () => {
        const response = await get(app, `/transaction/${nonExistentId}`)
        expect(response.status).to.equal(404)
      })

    it('non-existent transaction type - 404', async () => {
        const response = await get(app, `/transaction?apiType=${TransactionApiType.order}`)
        expect(response.status).to.equal(404)
      })

      it('it should get all transactions - 404', async () => {
        cleanup()
        const response = await get(app, `/transaction/`)
        expect(response.status).to.equal(404)
      })
  })
})