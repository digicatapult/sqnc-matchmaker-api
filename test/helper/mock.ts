import { MockAgent, setGlobalDispatcher } from 'undici'
import env from '../../src/env'

export const selfAlias = 'test-self'
export const selfAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
export const notSelfAlias = 'test-not-self'
export const notSelfAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

const mockAgent = new MockAgent()
setGlobalDispatcher(mockAgent)

const mockIdentity = mockAgent.get(`http://${env.IDENTITY_SERVICE_HOST}:${env.IDENTITY_SERVICE_PORT}`)
const mockIpfs = mockAgent.get(`http://${env.IPFS_HOST}:${env.IPFS_PORT}`)

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

export const ipfsMock = () => {
  mockIpfs
    .intercept({
      path: '/api/v0/add?cid-version=0&wrap-with-directory=true',
      method: 'POST',
    })
    .reply(200, { Name: '', Hash: 'QmXVStDC6kTpVHY1shgBQmyA4SuSrYnNRnHSak5iB6Eehn', Size: '63052' })
}

export const ipfsMockError = () => {
  mockIpfs
    .intercept({
      path: '/api/v0/add?cid-version=0&wrap-with-directory=true',
      method: 'POST',
    })
    .reply(500, 'error')
}
