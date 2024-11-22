import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'
import { container } from 'tsyringe'

import { ServiceWatcher } from '../../../src/lib/service-watcher/index.js'
import createHttpServer from '../../../src/server.js'
import { get } from '../../helper/routeHelper.js'
import { responses as healthResponses } from '../../helper/healthHelper.js'
import { withOkMock, withIpfsMockError } from '../../helper/mockHealth.js'
import { resetContainer } from '../../../src/ioc.js'

const getSpecVersion = (actualResult: any) => {
  return actualResult?._body?.details?.api?.detail?.runtime?.versions?.spec
}
const getIpfsVersion = (actualResult: any) => {
  return actualResult?._body?.details?.ipfs?.detail?.version
}
const getIdentityVersion = (actualResult: any) => {
  return actualResult?._body?.details?.identity?.detail?.version
}
const getIndexerStatus = (actualResult: any) => {
  return actualResult?._body?.details?.indexer?.status
}
const getIndexerStartupTime = (actualResult: any) => {
  return actualResult?._body?.details?.indexer?.detail?.startupTime
}
const getIndexerLatestActivityTime = (actualResult: any) => {
  return actualResult?._body?.details?.indexer?.detail?.latestActivityTime
}
describe('health check', () => {
  describe('happy path', function () {
    let app: Express

    withOkMock()

    before(async function () {
      app = await createHttpServer()
    })

    after(async function () {
      const serviceWatcher = container.resolve<ServiceWatcher>(ServiceWatcher)
      await serviceWatcher.close()
      resetContainer()
    })

    it('health check', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.ok(
        getSpecVersion(actualResult),
        getIpfsVersion(actualResult),
        getIdentityVersion(actualResult),
        getIndexerStatus(actualResult),
        getIndexerStartupTime(actualResult),
        getIndexerLatestActivityTime(actualResult)
      )
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })

  describe('ipfs service down', function () {
    let app: Express

    before(async function () {
      app = await createHttpServer()
    })

    after(async function () {
      const serviceWatcher = container.resolve<ServiceWatcher>(ServiceWatcher)
      await serviceWatcher.close()
      resetContainer()
    })

    withIpfsMockError()

    it('service down', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.ipfsDown(
        getSpecVersion(actualResult),
        getIdentityVersion(actualResult),
        getIndexerStatus(actualResult),
        getIndexerStartupTime(actualResult),
        getIndexerLatestActivityTime(actualResult)
      )
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })
})
