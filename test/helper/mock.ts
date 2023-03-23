import { MockAgent, setGlobalDispatcher } from 'undici'
import env from '../../src/env'

export const selfAlias = 'test-self'
export const selfAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
export const mockTokenIds = [42, 43, 44]

const mockAgent = new MockAgent()
setGlobalDispatcher(mockAgent)

const mockIdentity = mockAgent.get(`http://${env.IDENTITY_SERVICE_HOST}:${env.IDENTITY_SERVICE_PORT}`)
const mockApi = mockAgent.get(`http://${env.DSCP_API_HOST}:${env.DSCP_API_PORT}`)

export const identitySelfMock = () => {
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
      path: `/v1/members/${selfAddress}`,
      method: 'GET',
    })
    .reply(200, {
      alias: selfAlias,
      address: selfAddress,
    })
    .persist()
}

export const apiRunProcessMock = () => {
  mockApi
    .intercept({
      path: '/v3/run-process',
      method: 'POST',
    })
    .reply(200, mockTokenIds.slice(0, 1))
}

export const apiRunProcessMockError = () => {
  mockApi
    .intercept({
      path: '/v3/run-process',
      method: 'POST',
    })
    .reply(400, 'invalid')
}
