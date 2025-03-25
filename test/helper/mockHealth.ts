import env from '../../src/env.js'
import { MockDispatcherContext } from './mock.js'

export async function withOkMock(context: MockDispatcherContext) {
  beforeEach(async function () {
    const mockIpfs = context.mock.get(`http://${env.ATTACHMENT_SERVICE_HOST}:${env.ATTACHMENT_SERVICE_PORT}`)
    mockIpfs
      .intercept({
        path: `/health`,
        method: 'Get',
      })
      .reply(200, { version: '1.0.0', status: 'ok' })
      .persist()
  })
}

export const withAttachmentMockError = (context: MockDispatcherContext) => {
  beforeEach(function () {
    const mockAttachment = context.mock.get(`http://${env.ATTACHMENT_SERVICE_HOST}:${env.ATTACHMENT_SERVICE_PORT}`)

    mockAttachment
      .intercept({
        path: '/health',
        method: 'Get',
      })
      .reply(503, { status: 'down', version: '1.0.0' })
      .persist()
  })
}
