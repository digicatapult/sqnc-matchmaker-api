import { MockAgent, setGlobalDispatcher } from 'undici'
import { beforeEach, afterEach } from 'mocha'
import env from '../../src/env'

export const selfAlias = 'test-self'
export const selfAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'

const mockAgent = new MockAgent()
setGlobalDispatcher(mockAgent)

const mockPool = mockAgent.get(`http://${env.IDENTITY_SERVICE_HOST}:${env.IDENTITY_SERVICE_PORT}`)

export const setupIdentityMock = () => {
  beforeEach(async () => {
    mockAgent.activate()
    mockPool
      .intercept({
        path: '/v1/self',
        method: 'GET',
      })
      .reply(200, {
        alias: selfAlias,
        address: selfAddress,
      })

    mockPool
      .intercept({
        path: `/v1/members/${selfAddress}`,
        method: 'GET',
      })
      .reply(200, {
        alias: selfAlias,
        address: selfAddress,
      })
  })

  afterEach(async () => {
    mockAgent.deactivate()
  })
}
