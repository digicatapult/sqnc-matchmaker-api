import { type Logger } from 'pino'
import { SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/types'

import { type Env } from '../../src/env.js'
import { ProxyRequest } from '../../src/models/proxy.js'
import ChainNode, { EventData } from '../../src/lib/chainNode.js'
import { z } from 'zod'

const proxyParser = z.tuple([
  z.array(
    z.object({
      delay: z.number(),
      delegate: z.string(),
      proxyType: z.string(),
    })
  ),
  z.number(),
])

export default class ExtendedChainNode extends ChainNode {
  constructor(logger: Logger, env: Env) {
    super(logger, env)
  }

  async submitRunProcessForProxy(extrinsic: SubmittableExtrinsic<'promise', SubmittableResult>): Promise<void> {
    try {
      this.logger.debug('Submitting Transaction %j', extrinsic.hash.toHex())
      const unsub: () => void = await extrinsic.send((result: SubmittableResult): void => {
        this.logger.debug('result.status %s', JSON.stringify(result.status))

        const { dispatchError, status } = result

        if (dispatchError) {
          this.logger.warn('dispatch error %s', dispatchError, extrinsic)

          unsub()
          if (dispatchError.isModule) {
            const decoded = this.api.registry.findMetaError(dispatchError.asModule)
            throw new Error(`Node dispatch error: ${decoded.name}`)
          }

          throw new Error(`Unknown node dispatch error: ${dispatchError}`)
        }

        if (status.isFinalized) {
          const processRanEvent = result.events.find(
            ({ event: { method } }) => method === 'ProxyAdded' || 'ProxyRemoved'
          )
          const data = processRanEvent?.event?.data as EventData
          // is there anything sensible I can check here?
          if (!data) {
            throw new Error('No data returned')
          }

          unsub()
        }
      })
    } catch (err) {
      this.logger.warn(`Error in run process transaction: ${err}`)
    }
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

  async getProxies(delegatingAlias: string) {
    await this.api.isReady

    const account = this.keyring.addFromUri(delegatingAlias)
    const proxies = await this.api.query.proxy.proxies(account.address)
    const asJson = proxies.toJSON()
    return proxyParser.parse(asJson)[0]
  }
}
