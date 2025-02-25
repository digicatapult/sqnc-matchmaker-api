import type express from 'express'
import { describe, it } from 'mocha'
import { determineAddress } from '../address.js'
import Identity from '../../lib/services/identity.js'
import env from '../../env.js'
import { expect } from 'chai'
import { withIdentityMock } from './helpers/mockIdentity.js'

describe('address determination', function () {
  withIdentityMock()
  //   const identity = new Identity()
  const self = { address: 'self-address', alias: 'self-alias' }
  const proxyMember = { address: 'proxy-address', alias: 'proxy-alias' }
  const identity = {
    getMemberByAddress: async (address: string, auth: string) => proxyMember,
    getMemberBySelf: async (auth: string) => self,
  } as unknown as Identity
  const req = { headers: { authorization: 'dummy-token' } } as express.Request

  it('should use the self adress if supplied', async function () {
    const selfAddress = { address: '123', alias: 'selfAlias' }

    const result = await determineAddress(identity, env, req, selfAddress)
    expect(result).to.deep.equal(selfAddress)
  })
  it('should get member by address because proxy is provided', async function () {
    const result = await determineAddress(identity, env, req)
    expect(result).to.deep.equal(proxyMember)
  })
  it('should get member by self because proxy is not provided', async function () {
    const envNoProxy = { ...env, PROXY_FOR: '' }
    const result = await determineAddress(identity, envNoProxy, req)
    expect(result).to.deep.equal(self)
  })
})
