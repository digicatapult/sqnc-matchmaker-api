import type express from 'express'
import { describe, it } from 'mocha'
import { AddressResolver } from '../determineSelfAddress.js'
import Identity from '../../lib/services/identity.js'
import env from '../../env.js'
import { expect } from 'chai'
import { withIdentityMock } from './helpers/mockIdentity.js'

describe('address determination', function () {
  withIdentityMock()
  const selfAddress = { address: 'self-address', alias: 'self-alias' }
  const proxyMember = { address: 'proxy-address', alias: 'proxy-alias' }
  const identity = {
    getMemberByAddress: async () => proxyMember,
    getMemberBySelf: async () => selfAddress,
  } as unknown as Identity
  const req = { headers: { authorization: 'dummy-token' } } as express.Request
  describe('member by address', function () {
    it('should get member by address because proxy is provided', async function () {
      const addressResolver = new AddressResolver(identity, env)
      const result = await addressResolver.determineSelfAddress(req)
      expect(result).to.deep.equal(proxyMember)
    })
  })
  describe('member by self', function () {
    it('should get member by self because proxy is not provided', async function () {
      const envNoProxy = { ...env, PROXY_FOR: '' }
      const addressResolver = new AddressResolver(identity, envNoProxy)
      const result = await addressResolver.determineSelfAddress(req)
      expect(result).to.deep.equal(selfAddress)
    })
  })
})
