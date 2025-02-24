import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici'
import env from '../../../env.js'

export const selfAlias = 'test-self'
export const proxyAlias = '//Dave'
export const selfAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
export const proxyAddress = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'
export const notSelfAlias = 'test-not-self'
export const notSelfAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

export function withIdentityMock() {
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
