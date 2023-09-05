import { describe, before } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'
import { container } from 'tsyringe'
import { ServiceWatcher } from '../../../src/lib/service-watcher'

import createHttpServer from '../../../src/server'
import { get } from '../../helper/routeHelper'
import { responses as healthResponses } from '../../helper/healthHelper'
import { withOkMock, withIpfsMockError } from '../../helper/mockHealth'

const getSpecVersion = (actualResult: any) => {
  return actualResult?._body?.details?.api?.detail?.runtime?.versions?.spec
}
const getIpfsVersion = (actualResult: any) => {
  return actualResult?._body?.details?.ipfs?.detail?.version
}
const getIdentityVersion = (actualResult: any) => {
  return actualResult?._body?.detail?.version
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
      container.reset()
    })

    it('health check', async function () {
      const actualResult = await get(app, '/health')
      console.log(actualResult.body.details.identity)
      const response = healthResponses.ok(
        getSpecVersion(actualResult),
        getIpfsVersion(actualResult),
        getIdentityVersion(actualResult)
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
      container.reset()
    })

    withIpfsMockError()

    it('service down', async function () {
      const actualResult = await get(app, '/health')
      const response = healthResponses.ipfsDown(getSpecVersion(actualResult))
      expect(actualResult.status).to.equal(response.code)
      expect(actualResult.body).to.deep.equal(response.body)
    })
  })
})
