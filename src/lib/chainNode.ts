import { ApiPromise, WsProvider } from '@polkadot/api'
import { Logger } from 'pino'

export interface NodeCtorConfig {
  host: string
  port: number
  logger: Logger
}

export default class ChainNode {
  private provider: WsProvider
  private api: ApiPromise
  // private keyring: Keyring
  private logger: Logger

  constructor({ host, port, logger }: NodeCtorConfig) {
    this.logger = logger.child({ module: 'ChainNode' })
    this.provider = new WsProvider(`ws://${host}:${port}`)
    this.api = new ApiPromise({ provider: this.provider })
    // this.keyring = new Keyring({ type: 'sr25519' })

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.api.isReadyOrError.catch(() => {}) // prevent unhandled promise rejection errors

    this.api.on('disconnected', () => {
      this.logger.warn(`Disconnected from substrate node at ${host}:${port}`)
    })

    this.api.on('connected', () => {
      this.logger.info(`Connected to substrate node at ${host}:${port}`)
    })

    this.api.on('error', (err) => {
      this.logger.error(`Error from substrate node connection. Error was ${err.message || JSON.stringify(err)}`)
    })
  }

  async getLastFinalisedBlockHash(): Promise<string> {
    await this.api.isReady
    const result = await this.api.rpc.chain.getFinalizedHead()
    return result.toHex()
  }

  async getHeader(hash: string): Promise<{ hash: string; height: number; parent: string }> {
    await this.api.isReady
    const result = await this.api.rpc.chain.getHeader(hash)
    return {
      hash,
      height: result.number.toNumber(),
      parent: result.parentHash.toHex(),
    }
  }

  async watchFinalisedBlocks(onNewFinalisedHead: (blockHash: string) => Promise<void>) {
    await this.api.isReady
    await this.api.rpc.chain.subscribeFinalizedHeads((header) => onNewFinalisedHead(header.hash.toHex()))
  }
}
