import { type Logger } from 'pino'
import { injectable } from 'tsyringe'

import { type Env } from '../../src/env.js'
import { ProxyRequest } from '../../src/models/proxy.js'
import ChainNode from '../../src/lib/chainNode.js'

@injectable()
export default class ExtendedChainNode extends ChainNode {
  constructor(logger: Logger, env: Env) {
    super(logger, env)
  }

  async addProxy({ delegatingAlias, proxyAddress, proxyType, delay = 0 }: ProxyRequest) {
    // The proxy address (the account you want to set as a proxy for the delegatingAlias provided)
    // Proxy type (e.g., Any, Governance,RunProcess)
    // Delay in blocks (typically 0)
    await this.api.isReady
    const result = this.api.tx.proxy.addProxy(proxyAddress, proxyType, delay)

    // Send the transaction and wait for confirmation
    const account = this.keyring.addFromUri(delegatingAlias)

    const nonce = await this.mutex.runExclusive(async () => {
      const nextTxPoolNonce = (await this.api.rpc.system.accountNextIndex(account.publicKey)).toNumber()

      return nextTxPoolNonce
    })
    const signed = await result.signAsync(account, { nonce })
    return signed
  }
  async removeProxy({ delegatingAlias, proxyAddress, proxyType, delay = 0 }: ProxyRequest) {
    await this.api.isReady
    const result = this.api.tx.proxy.removeProxy(proxyAddress, proxyType, delay)

    // Send the transaction and wait for confirmation
    const account = this.keyring.addFromUri(delegatingAlias)

    const nonce = await this.mutex.runExclusive(async () => {
      const nextTxPoolNonce = (await this.api.rpc.system.accountNextIndex(account.publicKey)).toNumber()

      return nextTxPoolNonce
    })
    const signed = await result.signAsync(account, { nonce })
    return signed
  }
}
