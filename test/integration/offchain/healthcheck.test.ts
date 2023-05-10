import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'
import nock from 'nock'
import sinon from 'sinon'
import createHttpServer from '../../../src/server'
import { get } from '../../helper/routeHelper'
import { responses as healthResponses } from '../../helper/healthHelper'
import env from '../../../src/env'
import { logger } from '../../../src/lib/logger'
import ChainNode from '../../../src/lib/chainNode'
import { withOkMock, withIpfsMockError, withSubstrateMockError } from '../../helper/mockHealth'
const { IPFS_HOST, IPFS_PORT } = env

const node = new ChainNode({
  host: env.IPFS_HOST,
  port: env.IPFS_PORT,
  logger,
  userUri: env.USER_URI,
})

const api = node.getApi()

const getSpecVersion = (actualResult: any) => {
  return actualResult?._body?.details?.api?.detail?.runtime?.versions?.spec
}
const getIpfsVersion = (actualResult: any) => {
  return actualResult?._body?.details?.ipfs?.detail?.version
}

describe('health check', () => {
  describe('happy path', function () {
    let app: Express

    withOkMock()

    before(function () {
      nock(`http://${IPFS_HOST}:${IPFS_PORT}`)
        .get('/api/health')
        .reply(200, { Body: { status: 'ok' } })
    })

    after(function () {
      nock.cleanAll()
    })

    before(async function () {
      app = await createHttpServer()
    })

    it('health check', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.ok(getSpecVersion(actualResult), getIpfsVersion(actualResult))
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })

  describe('substrate service down', function () {
    let app: Express

    before(function () {
      this.stubs = [
        sinon.stub(api, 'isReadyOrError').get(() => Promise.reject()),
        sinon.stub(api, 'isConnected').get(() => false),
      ]
    })

    after(function () {
      for (const stub of this.stubs) {
        stub.restore()
      }
    })

    withSubstrateMockError()

    before(async function () {
      app = await createHttpServer()
    })

    it('service down', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.substrateDown(getIpfsVersion(actualResult))
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })

  describe('substrate service down then up', function () {
    let app: Express

    before(function () {
      this.clock = sinon.useFakeTimers()
      this.stubs = [
        sinon.stub(api, 'isReadyOrError').get(() => Promise.reject()),
        sinon
          .stub(api, 'isConnected')
          .onFirstCall()
          .get(() => false)
          .onSecondCall()
          .get(() => true),
      ]
    })

    after(function () {
      for (const stub of this.stubs) {
        stub.restore()
      }
      this.clock.restore()
    })

    before(async function () {
      app = await createHttpServer()
    })

    it('service up', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.ok(getSpecVersion(actualResult), getIpfsVersion(actualResult))
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })

  describe('ipfs service down', function () {
    let app: Express

    before(async function () {
      app = await createHttpServer()
    })

    withIpfsMockError()

    it('service down', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.ipfsDown(getSpecVersion(actualResult))
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })

  describe('ipfs service no peers', function () {
    let app: Express

    before(function () {
      nock(`http://${env.IPFS_HOST}:${env.IPFS_PORT}`)
        .post('/api/v0/version')
        .reply(200, { Version: '0.18.1' })
        .post('/api/v0/swarm/peers')
        .reply(200, { Peers: null })
    })

    after(function () {
      nock.cleanAll()
    })

    before(async function () {
      app = await createHttpServer()
    })

    it('service down', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.ipfsDownNoPeers(getSpecVersion(actualResult), getIpfsVersion(actualResult))
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })
})
