import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici'
import env from '../../src/env'
import { responses as healthResponses } from './healthHelper'

const okResponse = healthResponses.ok
const ipfsDown = healthResponses.ipfsDown
const substrateDown = healthResponses.substrateDown

export async function withOkMock() {
  let originalDispatcher: Dispatcher
  let mockAgent: MockAgent
  beforeEach(async function () {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    setGlobalDispatcher(mockAgent)
    const mockIdentity = mockAgent.get(`http://${env.IPFS_HOST}:${env.IPFS_PORT}`)
    mockIdentity
      .intercept({
        path: `/api/v0/version`,
        method: 'POST',
      })
      .reply(200, {
        okResponse,
      })
      .persist()

    mockIdentity
      .intercept({
        path: `/api/v0/swarm/peers`,
        method: 'POST',
      })
      .reply(200, {
        okResponse,
      })
      .persist()

    mockIdentity
      .intercept({
        path: `http://${env.IPFS_HOST}:${env.IPFS_PORT}/api/v0/version`,
        method: 'POST',
      })
      .reply(200, {
        okResponse,
      })
      .persist()

    mockIdentity
      .intercept({
        path: `http://${env.IPFS_HOST}:${env.IPFS_PORT}/api/v0/swarm/peers`,
        method: 'POST',
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
    const mockIpfs = mockAgent.get(`http://${env.IPFS_HOST}:${env.IPFS_PORT}`)

    mockIpfs
      .intercept({
        path: '/default/Get',
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
    const mockIpfs = mockAgent.get(`http://${env.IPFS_HOST}:${env.IPFS_PORT}`)

    mockIpfs
      .intercept({
        path: '/default/Get',
        method: 'GET',
      })
      .reply(503, substrateDown)
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
