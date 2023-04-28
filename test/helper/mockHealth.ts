import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici'
import env from '../../src/env'
import { responses as healthResponses } from './healthHelper'

const okResponse = healthResponses.ok
const ipfsDown = healthResponses.ipfsDown
const substrateDown = healthResponses.substrateDown

export function withOkMock() {
  let originalDispatcher: Dispatcher
  let mockAgent: MockAgent
  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    setGlobalDispatcher(mockAgent)
    const mockIdentity = mockAgent.get(`http://${env.NODE_HOST}:${env.NODE_PORT}`)
    mockIdentity
      .intercept({
        path: '/health',
        method: 'GET',
      })
      .reply(200, {
        okResponse,
      })
      .persist()
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
    const mockIpfs = mockAgent.get(`http://${env.NODE_HOST}:${env.NODE_PORT}`)

    mockIpfs
      .intercept({
        path: '/health',
        method: 'GET',
      })
      .reply(503, ipfsDown)
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}

export const withSubstrateMockError = () => {
  let originalDispatcher: Dispatcher
  let mockAgent: MockAgent

  beforeEach(function () {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    setGlobalDispatcher(mockAgent)
    const mockIpfs = mockAgent.get(`http://${env.NODE_HOST}:${env.NODE_PORT}`)

    mockIpfs
      .intercept({
        path: '/health',
        method: 'GET',
      })
      .reply(503, substrateDown)
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
