import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici'
import env from '../../src/env.js'

export const selfAlias = 'test-self'
export const proxyAlias = '//Dave'
export const selfAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
export const proxyAddress = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'
export const notSelfAlias = 'test-not-self'
export const notSelfAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
export const parametersAttachmentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf8'
export const exampleDate = '2023-01-01T00:00:00.000Z'

export type MockDispatcherContext = { original: Dispatcher; mock: MockAgent }

export function withDispatcherMock(context: MockDispatcherContext) {
  beforeEach(function () {
    context.original = getGlobalDispatcher()
    context.mock = new MockAgent()
    setGlobalDispatcher(context.mock)
  })

  afterEach(function () {
    setGlobalDispatcher(context.original)
  })
}

export function withIdentitySelfMock(context: MockDispatcherContext) {
  beforeEach(function () {
    const mockIdentity = context.mock.get(`http://${env.IDENTITY_SERVICE_HOST}:${env.IDENTITY_SERVICE_PORT}`)
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
}

export const withAttachmentMock = (context: MockDispatcherContext) => {
  beforeEach(function () {
    const mockAttachment = context.mock.get(`http://${env.ATTACHMENT_SERVICE_HOST}:${env.ATTACHMENT_SERVICE_PORT}`)

    mockAttachment
      .intercept({
        path: '/v1/attachment',
        method: 'POST',
      })
      .reply(200, {
        id: '42',
        integrityHash: 'QmXVStDC6kTpVHY1shgBQmyA4SuSrYnNRnHSak5iB6Eehn',
        filename: 'test.txt',
        size: 63052,
        createdAt: '2021-08-31T12:00:00Z',
      })
      .persist()

    mockAttachment
      .intercept({
        path: `/v1/attachment?id=${parametersAttachmentId}`,
        method: 'GET',
      })
      .reply(200, [
        {
          id: parametersAttachmentId,
          filename: 'test.txt',
          integrityHash: 'QmXVStDC6kTpVHY1shgBQmyA4SuSrYnNRnHSak5iB6Eehn',
          size: 42,
          createdAt: exampleDate,
        },
      ])
      .persist()
  })
}
