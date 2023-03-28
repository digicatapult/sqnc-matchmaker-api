import { MockAgent, setGlobalDispatcher } from 'undici'
import env from '../../src/env'

export const selfAlias = 'test-self'
export const selfAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
export const notSelfAlias = 'test-not-self'
export const notSelfAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
export const demandCreateMockTokenId = 42
export const match2ProposeMockTokenIds = [52, 53, 54]
export const match2AcceptMockTokenId = 62
export const match2AcceptFinalMockTokenIds = [72, 73, 74]

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
}

export const demandCreateMock = () => {
  mockApi
    .intercept({
      path: '/v3/run-process',
      method: 'POST',
    })
    .reply(200, [demandCreateMockTokenId])
}

export const match2ProposeMock = () => {
  mockApi
    .intercept({
      path: '/v3/run-process',
      method: 'POST',
    })
    .reply(200, match2ProposeMockTokenIds)
}

export const match2AcceptMock = () => {
  mockApi
    .intercept({
      path: '/v3/run-process',
      method: 'POST',
    })
    .reply(200, [match2AcceptMockTokenId])
}

export const match2AcceptFinalMock = () => {
  mockApi
    .intercept({
      path: '/v3/run-process',
      method: 'POST',
    })
    .reply(200, match2AcceptFinalMockTokenIds)
}

export const apiRunProcessMockError = () => {
  mockApi
    .intercept({
      path: '/v3/run-process',
      method: 'POST',
    })
    .reply(400, 'invalid')
}
