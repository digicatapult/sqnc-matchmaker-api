import sinon from 'sinon'
import type { Logger } from 'pino'

export const withMockLogger = () => {
  const inner = {
    trace: sinon.stub(),
    debug: sinon.stub(),
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    fatal: sinon.stub(),
    child: sinon.stub(),
  }

  inner.child.returns(inner)

  return inner as unknown as Logger
}
