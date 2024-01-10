import sinon from 'sinon'
import type { Logger } from 'pino'

export const withMockLogger = () => {
  const inner = {
    trace: sinon.stub(),
    debug: sinon.stub(),
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
  }

  return {
    child: sinon.stub().returns(inner),
  } as unknown as Logger
}
