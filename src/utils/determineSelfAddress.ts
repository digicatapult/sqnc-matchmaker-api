import type express from 'express'
import { EnvToken, type Env } from '../env.js'
import Identity from '../lib/services/identity.js'
import { getAuthorization } from '../lib/utils/shared.js'
import { inject, singleton } from 'tsyringe'

@singleton()
export class AddressResolver {
  private self: { address: string; alias: string } | null = null
  private identity: Identity
  private proxyFor: string

  constructor(identity: Identity, @inject(EnvToken) env: Env) {
    this.identity = identity
    this.proxyFor = env.PROXY_FOR
  }

  public async determineSelfAddress(req: express.Request) {
    let res: { address: string; alias: string }
    if (this.proxyFor !== '') {
      res = this.self || (await this.identity.getMemberByAddress(this.proxyFor, getAuthorization(req)))
    } else {
      res = this.self || (await this.identity.getMemberBySelf(getAuthorization(req)))
    }

    this.self = res
    return res
  }
}
