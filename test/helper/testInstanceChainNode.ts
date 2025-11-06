import { type Logger } from 'pino'
import { SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/types'

import { EnvToken, type Env } from '../../src/env.js'
import { ProxyRequest } from '../../src/models/proxy.js'
import ChainNode, { EventData } from '../../src/lib/chainNode.js'
import { z } from 'zod'
import { Output, Payload } from '../../src/lib/payload.js'
import { ISubmittableResult } from '@polkadot/types/types'
import { inject, singleton } from 'tsyringe'
import { LoggerToken } from '../../src/lib/logger.js'

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

@singleton()
export default class ExtendedChainNode extends ChainNode {
  private sudoUri = '//Alice'

  constructor(@inject(LoggerToken) logger: Logger, @inject(EnvToken) env: Env) {
    super(logger, env)
  }

  async submitRunProcessForProxy(extrinsic: SubmittableExtrinsic<'promise', SubmittableResult>): Promise<void> {
    try {
      this.logger.debug('Submitting Transaction %s', extrinsic.hash.toHex())
      const unsub: () => void = await extrinsic.send((result: SubmittableResult): void => {
        this.logger.debug('result.status %s', JSON.stringify(result.status))

        const { dispatchError, status } = result

        if (dispatchError) {
          this.logger.warn(dispatchError, 'dispatch error %s', extrinsic.toJSON())

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

  async addProxy({
    delegatingAlias,
    proxyAddress,
    proxyType,
    delay = 0,
  }: ProxyRequest): Promise<SubmittableExtrinsic<'promise', SubmittableResult>> {
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
  async removeProxy({
    delegatingAlias,
    proxyAddress,
    proxyType,
    delay = 0,
  }: ProxyRequest): Promise<SubmittableExtrinsic<'promise', SubmittableResult>> {
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

  async prepareRunProcessAsSudo({ process, inputs, outputs }: Payload) {
    const outputsAsMaps = await Promise.allSettled(
      outputs.map(async (output: Output) => [output.roles, this.processMetadata(output.metadata)])
    )
    const fulfilledOutputs = outputsAsMaps
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
    const rejectedOutputs = outputsAsMaps
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason)
    if (rejectedOutputs.length > 0) {
      throw new Error(`${rejectedOutputs.length} rejected outputs as maps with Error: ${rejectedOutputs[0]}`)
    }

    this.logger.debug('Preparing Transaction inputs: %j outputs: %j', inputs, fulfilledOutputs)

    await this.api.isReady
    let extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult> = this.api.tx.sudo.sudo(
      this.api.tx.utxoNFT.runProcessAsRoot(process, inputs, fulfilledOutputs)
    )
    const account = this.keyring.addFromUri(this.sudoUri)

    const nonce = await this.mutex.runExclusive(async () => {
      const nextTxPoolNonce = (await this.api.rpc.system.accountNextIndex(account.publicKey)).toNumber()
      return nextTxPoolNonce
    })

    const signed = await extrinsic.signAsync(account, { nonce })
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
