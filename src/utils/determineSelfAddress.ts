import { EnvToken, type Env } from '../env.js'
import Identity from '../lib/services/identity.js'
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

  async determineSelfAddress() {
    let res: { address: string; alias: string }
    if (this.proxyFor !== '') {
      res = this.self || (await this.identity.getMemberByAddress(this.proxyFor))
    } else {
      res = this.self || (await this.identity.getMemberBySelf())
    }

    this.self = res
    return res
  }
}
