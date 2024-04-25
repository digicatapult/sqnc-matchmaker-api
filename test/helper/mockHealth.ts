import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici'

import env from '../../src/env.js'

export async function withOkMock() {
  let originalDispatcher: Dispatcher
  let mockAgent: MockAgent
  beforeEach(async function () {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    setGlobalDispatcher(mockAgent)
    const mockIpfs = mockAgent.get(`http://${env.IPFS_HOST}:${env.IPFS_PORT}`)
    mockIpfs
      .intercept({
        path: `/api/v0/version`,
        method: 'POST',
      })
      .reply(200, { Version: '0.20.0' })
      .persist()

    mockIpfs
      .intercept({
        path: `/api/v0/swarm/peers`,
        method: 'POST',
      })
      .reply(200, {
        Peers: [{ Peer: '1', Addr: '2' }],
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
        path: '/api/v0/version',
        method: 'POST',
      })
      .reply(404, {})
  })

  afterEach(function () {
    setGlobalDispatcher(originalDispatcher)
  })
}
