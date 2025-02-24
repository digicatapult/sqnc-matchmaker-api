import { type Logger } from 'pino'
import { ApiPromise, WsProvider, Keyring, SubmittableResult } from '@polkadot/api'
import { blake2AsHex } from '@polkadot/util-crypto'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import type { u128 } from '@polkadot/types'
import { inject, singleton } from 'tsyringe'
import { Mutex } from 'async-mutex'

import { serviceState } from './service-watcher/statusPoll.js'
import { TransactionState } from '../models/transaction.js'
import type { Payload, Output, Metadata } from './payload.js'
import { HEX } from '../models/strings.js'
import { hexToBs58 } from '../utils/hex.js'
import { trim0x } from './utils/shared.js'
import { LoggerToken } from './logger.js'
import { type Env, EnvToken } from '../env.js'
import { ISubmittableResult } from '@polkadot/types/types'

const processRanTopic = blake2AsHex('utxoNFT.ProcessRan')

export interface NodeCtorConfig {
  host: string
  port: number
  logger: Logger
  userUri: string
}

export interface ProcessRanEvent {
  callHash: HEX
  blockHash: HEX
  sender: string
  process: {
    id: string
    version: number
  }
  inputs: number[]
  outputs: number[]
}

interface SubstrateToken {
  id: number
  metadata: {
    [key in string]: { literal: string } | { file: string } | { tokenId: number } | { None: null }
  }
  roles: {
    [key in 'Owner' | 'MemberA' | 'MemberB' | 'Optimiser']: string
  }
}

export type EventData =
  | {
      outputs: u128[]
    }
  | undefined

@singleton()
export default class ChainNode {
  private provider: WsProvider
  protected api: ApiPromise
  protected keyring: Keyring
  protected logger: Logger
  private userUri: string
  private lastSubmittedNonce: number
  protected mutex = new Mutex()
  private proxyAddress: string | null = null

  constructor(@inject(LoggerToken) logger: Logger, @inject(EnvToken) env: Env) {
    this.logger = logger.child({ module: 'ChainNode' })
    this.logger.info(`starting WsProvider ws://${env.NODE_HOST}:${env.NODE_PORT}`)
    this.provider = new WsProvider(`ws://${env.NODE_HOST}:${env.NODE_PORT}`)
    this.userUri = env.USER_URI
    this.logger.info(`user URI: ${env.USER_URI}`)
    this.api = new ApiPromise({ provider: this.provider })
    this.keyring = new Keyring({ type: 'sr25519' })
    this.lastSubmittedNonce = -1
    this.proxyAddress = env.PROXY_FOR === null ? null : env.PROXY_FOR

    this.api.isReadyOrError.catch(() => {
      // prevent unhandled promise rejection errors
    })

    this.api.on('disconnected', () => {
      this.logger.warn(`Disconnected from substrate node at ${env.NODE_HOST}:${env.NODE_PORT}`)
    })

    this.api.on('connected', () => {
      this.logger.info(`Connected to substrate node at ${env.NODE_HOST}:${env.NODE_PORT}`)
    })

    this.api.on('error', (err) => {
      this.logger.error(`Error from substrate node connection. Error was ${err.message || JSON.stringify(err)}`)
    })
  }

  getStatus = async () => {
    await this.api.isReady
    if (!this.api.isConnected) {
      return {
        status: serviceState.DOWN,
        detail: {
          message: 'Cannot connect to substrate node',
        },
      }
    }
    const [chain, runtime] = await Promise.all([this.api.runtimeChain, this.api.runtimeVersion])
    return {
      status: serviceState.UP,
      detail: {
        chain,
        runtime: {
          name: runtime.specName,
          versions: {
            spec: runtime.specVersion.toNumber(),
            impl: runtime.implVersion.toNumber(),
            authoring: runtime.authoringVersion.toNumber(),
            transaction: runtime.transactionVersion.toNumber(),
          },
        },
      },
    }
  }

  async getLastFinalisedBlockHash(): Promise<HEX> {
    await this.api.isReady
    const result = await this.api.rpc.chain.getFinalizedHead()
    return result.toHex()
  }

  async getHeader(hash: HEX): Promise<{ hash: HEX; height: number; parent: HEX }> {
    await this.api.isReady
    const result = await this.api.rpc.chain.getHeader(hash)
    return {
      hash,
      height: result.number.toNumber(),
      parent: result.parentHash.toHex(),
    }
  }

  async prepareRunProcess({ process, inputs, outputs }: Payload) {
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
    //optionally use proxy here

    // let extrinsic
    // if (this.proxyAddress) {
    //   extrinsic = this.api.tx.proxy.proxy(
    //     { id: this.proxyAddress },
    //     null,
    //     this.api.tx.utxoNFT.runProcess(process, inputs, fulfilledOutputs)
    //   )
    // } else {
    //   extrinsic = this.api.tx.utxoNFT.runProcess(process, inputs, fulfilledOutputs)
    // }
    let extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult> = this.api.tx.utxoNFT.runProcess(
      process,
      inputs,
      fulfilledOutputs
    )
    if (this.proxyAddress) {
      extrinsic = this.api.tx.proxy.proxy({ id: this.proxyAddress }, null, extrinsic)
    }
    const account = this.keyring.addFromUri(this.userUri)

    const nonce = await this.mutex.runExclusive(async () => {
      const nextTxPoolNonce = (await this.api.rpc.system.accountNextIndex(account.publicKey)).toNumber()
      const nonce = Math.max(nextTxPoolNonce, this.lastSubmittedNonce + 1)
      this.lastSubmittedNonce = nonce
      return nonce
    })

    const signed = await extrinsic.signAsync(account, { nonce })
    return signed
  }

  async submitRunProcess(
    extrinsic: SubmittableExtrinsic<'promise', SubmittableResult>,
    transactionDbUpdate: (state: TransactionState) => Promise<void>
  ): Promise<void> {
    try {
      this.logger.debug('Submitting Transaction %j', extrinsic.hash.toHex())
      const unsub: () => void = await extrinsic.send((result: SubmittableResult): void => {
        this.logger.debug('result.status %s', JSON.stringify(result.status))

        const { dispatchError, status } = result

        if (dispatchError) {
          this.logger.warn('dispatch error %s', dispatchError)
          transactionDbUpdate('failed')
          unsub()
          if (dispatchError.isModule) {
            const decoded = this.api.registry.findMetaError(dispatchError.asModule)
            throw new Error(`Node dispatch error: ${decoded.name}`)
          }

          throw new Error(`Unknown node dispatch error: ${dispatchError}`)
        }

        if (status.isInBlock) transactionDbUpdate('inBlock')
        if (status.isFinalized) {
          const processRanEvent = result.events.find(({ event: { method } }) => method === 'ProcessRan')
          const data = processRanEvent?.event?.data as EventData
          const tokens = data?.outputs?.map((x) => x.toNumber())

          if (!tokens) {
            transactionDbUpdate('failed')
            throw new Error('No token IDs returned')
          }

          transactionDbUpdate('finalised')
          unsub()
        }
      })
    } catch (err) {
      transactionDbUpdate('failed')
      this.logger.warn(`Error in run process transaction: ${err}`)
    }
  }

  processMetadata(metadata: Metadata) {
    return new Map(
      Object.entries(metadata).map(([key, value]) => {
        let processedValue
        switch (value.type) {
          case 'LITERAL':
            processedValue = { Literal: value.value as string }
            break
          case 'TOKEN_ID':
            processedValue = { TokenId: value.value as string }
            break
          case 'FILE':
            processedValue = { File: value.value as string }
            break
          default:
          case 'NONE':
            processedValue = { None: null }
            break
        }

        return [key, processedValue] as readonly [unknown, unknown]
      })
    )
  }

  async getLastTokenId() {
    await this.api.isReady
    const lastTokenId = await this.api.query.utxoNFT.lastToken()

    return lastTokenId ? parseInt(lastTokenId.toString(), 10) : 0
  }

  async watchFinalisedBlocks(onNewFinalisedHead: (blockHash: string) => Promise<void>) {
    await this.api.isReady
    await this.api.rpc.chain.subscribeFinalizedHeads((header) => onNewFinalisedHead(header.hash.toHex()))
  }

  async getProcessRanEvents(blockhash: HEX): Promise<ProcessRanEvent[]> {
    await this.api.isReady
    const apiAtBlock = await this.api.at(blockhash)
    const processRanEventIndexes = (await apiAtBlock.query.system.eventTopics(processRanTopic)) as unknown as [
      never,
      number,
    ][]
    if (processRanEventIndexes.length === 0) {
      return []
    }

    const block = await this.api.rpc.chain.getBlock(blockhash)
    const events = (await apiAtBlock.query.system.events()) as unknown as {
      event: { data: unknown[] }
      phase: { get asApplyExtrinsic(): number }
    }[]
    return processRanEventIndexes.map(([, index]) => {
      const event = events[index]
      const extrinsicIndex = event.phase.asApplyExtrinsic
      const process = event.event.data[1] as { id: string; version: { toNumber: () => number } }
      return {
        callHash: block.block.extrinsics[extrinsicIndex].hash.toString() as HEX,
        blockHash: blockhash,
        sender: (event.event.data[0] as { toString: () => string }).toString(),
        process: {
          id: Buffer.from(process.id).toString('ascii'),
          version: process.version.toNumber(),
        },
        inputs: (event.event.data[2] as { toNumber: () => number }[]).map((i) => i.toNumber()),
        outputs: (event.event.data[3] as { toNumber: () => number }[]).map((o) => o.toNumber()),
      }
    })
  }

  async getToken(tokenId: number, blockHash: HEX | null = null) {
    const api = blockHash ? await this.api.at(blockHash) : this.api
    const token = (await api.query.utxoNFT.tokensById(tokenId)).toJSON() as unknown as SubstrateToken
    const metadata = new Map(
      Object.entries(token.metadata).map(([keyHex, entry]) => {
        const key = Buffer.from(keyHex.substring(2), 'hex').toString('utf8')
        const [valueKey, valueRaw] = Object.entries(entry)[0]
        if (valueKey === 'None' || valueKey === 'tokenId') {
          return [key, valueRaw]
        }

        if (valueKey === 'file') {
          return [key, hexToBs58(valueRaw)]
        }

        const valueHex = valueRaw || '0x'
        const value = Buffer.from(valueHex.substring(2), 'hex').toString('utf8')
        return [key, value]
      })
    )

    const roles = new Map(
      Object.entries(token.roles).map(([role, account]) => [
        Buffer.from(trim0x(role), 'hex').toString('utf8').toLowerCase(),
        account,
      ])
    )

    return {
      id: token.id,
      metadata,
      roles,
    }
  }

  async sealBlock(createEmpty: boolean = true, finalise: boolean = true) {
    return await this.api.rpc.engine.createBlock(createEmpty, finalise)
  }

  // continue sealing blocks if there are transactions
  async clearAllTransactions(createEmpty: boolean = true, finalise: boolean = true) {
    while (true) {
      const pending = await this.api.rpc.author.pendingExtrinsics()
      if (pending.length === 0) {
        return
      }
      await this.api.rpc.engine.createBlock(createEmpty, finalise)
    }
  }
}
