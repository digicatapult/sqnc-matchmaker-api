import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici'
import env from '../../src/env.js'

export const selfAlias = 'test-self'
export const proxyAlias = '//Dave'
export const selfAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
export const proxyAddress = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'
export const notSelfAlias = 'test-not-self'
export const notSelfAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

export function withIdentitySelfMock() {
  let originalDispatcher: Dispatcher
  let mockAgent: MockAgent
  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    setGlobalDispatcher(mockAgent)
    const mockIdentity = mockAgent.get(`http://${env.IDENTITY_SERVICE_HOST}:${env.IDENTITY_SERVICE_PORT}`)
    mockIdentity
      .intercept({
        path: '/v1/self',
        method: 'GET',
      })
      .reply(200, {
        alias: selfAlias,
        address: selfAddress,
      })
      .persist()

    mockIdentity
      .intercept({
        path: `/v1/members/${proxyAddress}`,
        method: 'GET',
      })
      .reply(200, {
        alias: proxyAlias,
        address: proxyAddress,
      })
      .persist()

    mockIdentity
      .intercept({
        path: `/v1/members/${notSelfAddress}`,
        method: 'GET',
      })
      .reply(200, {
        alias: notSelfAlias,
        address: notSelfAddress,
      })
      .persist()
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}

export const withIpfsMock = (fileContent?: string | object | Buffer) => {
  let originalDispatcher: Dispatcher
  let mockAgent: MockAgent

  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    setGlobalDispatcher(mockAgent)
    const mockIpfs = mockAgent.get(`http://${env.IPFS_HOST}:${env.IPFS_PORT}`)

    mockIpfs
      .intercept({
        path: '/api/v0/add?cid-version=0&wrap-with-directory=true',
        method: 'POST',
      })
      .reply(200, { Name: '', Hash: 'QmXVStDC6kTpVHY1shgBQmyA4SuSrYnNRnHSak5iB6Eehn', Size: '63052' })

    mockIpfs
      .intercept({
        path: '/api/v0/ls?arg=QmXVStDC6kTpVHY1shgBQmyA4SuSrYnNRnHSak5iB6Eehn',
        method: 'POST',
      })
      .reply(200, {
        Objects: [{ Links: [{ Hash: 'file_hash', Name: 'test' }] }],
      })
    if (fileContent) {
      mockIpfs
        .intercept({
          path: '/api/v0/cat?arg=file_hash',
          method: 'POST',
        })
        .reply(200, fileContent)
    }
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}

export const withIpfsMockError = () => {
  let originalDispatcher: Dispatcher
  let mockAgent: MockAgent

  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    setGlobalDispatcher(mockAgent)
    const mockIpfs = mockAgent.get(`http://${env.IPFS_HOST}:${env.IPFS_PORT}`)

    mockIpfs
      .intercept({
        path: '/api/v0/add?cid-version=0&wrap-with-directory=true',
        method: 'POST',
      })
      .reply(500, 'error')
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
