import { ApiPromise, WsProvider, Keyring, SubmittableResult } from '@polkadot/api'
import { blake2AsHex } from '@polkadot/util-crypto'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import type { u128 } from '@polkadot/types'

import { Logger } from 'pino'
import { TransactionState } from '../models/transaction'
import { HttpResponse } from './error-handler'

import type { Payload, Output, Metadata } from './payload'

const processRanTopic = blake2AsHex('utxoNFT.ProcessRan')

export interface NodeCtorConfig {
  host: string
  port: number
  logger: Logger
  userUri: string
}

export interface ProcessRanEvent {
  callHash: string
  sender: string
  process: {
    id: string
    version: number
  }
  inputs: number[]
  outputs: number[]
}

interface RoleEnum {
  name: string | undefined
  index: number | undefined
}

type EventData =
  | {
      outputs: u128[]
    }
  | undefined

export default class ChainNode {
  private provider: WsProvider
  private api: ApiPromise
  private keyring: Keyring
  private logger: Logger
  private userUri: string
  private roles: RoleEnum[]

  constructor({ host, port, logger, userUri }: NodeCtorConfig) {
    this.logger = logger.child({ module: 'ChainNode' })
    this.provider = new WsProvider(`ws://${host}:${port}`)
    this.userUri = userUri
    this.api = new ApiPromise({ provider: this.provider })
    this.keyring = new Keyring({ type: 'sr25519' })
    this.roles = []

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

  async getRoles(): Promise<RoleEnum[]> {
    await this.api.isReady

    const registry = this.api.registry
    const lookup = registry.lookup
    const lookupId = registry.getDefinition('DscpNodeRuntimeRole') as `Lookup${number}`

    const rolesEnum = lookup.getTypeDef(lookupId).sub
    if (Array.isArray(rolesEnum)) {
      return rolesEnum.map((e) => ({ name: e.name, index: e.index }))
    } else {
      throw new Error('No roles found on-chain')
    }
  }

  roleToIndex(role: string) {
    const entry = this.roles.find((e) => e.name === role)

    if (!entry || entry.index === undefined) {
      throw new Error(`Invalid role: ${role}`)
    }

    return entry.index
  }

  async prepareRunProcess({ process, inputs, outputs }: Payload) {
    const outputsAsMaps = await Promise.all(
      outputs.map(async (output: Output) => [
        await this.processRoles(output.roles),
        this.processMetadata(output.metadata),
      ])
    )

    this.logger.debug('Preparing Transaction inputs: %j outputs: %j', inputs, outputsAsMaps)

    await this.api.isReady
    const extrinsic = await this.api.tx.utxoNFT.runProcess(process, inputs, outputsAsMaps)
    const account = this.keyring.addFromUri(this.userUri)
    const signed = await extrinsic.signAsync(account, { nonce: -1 })
    return signed
  }

  async submitRunProcess(
    extrinsic: SubmittableExtrinsic<'promise', SubmittableResult>,
    transactionDbUpdate: (state: TransactionState) => Promise<void>
  ): Promise<number[]> {
    this.logger.debug('Submitting Transaction %j', extrinsic.hash.toHex())
    return new Promise((resolve, reject) => {
      let unsub: () => void
      extrinsic
        .send((result: SubmittableResult) => {
          this.logger.debug('result.status %s', JSON.stringify(result.status))

          const { dispatchError, status } = result

          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = this.api.registry.findMetaError(dispatchError.asModule)
              reject(new HttpResponse({ message: `Node dispatch error: ${decoded.name}` }))
            } else {
              reject(new HttpResponse({ message: `Unknown node dispatch error: ${dispatchError}` }))
            }
          }

          if (status.isInBlock) {
            transactionDbUpdate('inBlock')
          }

          if (status.isFinalized) {
            transactionDbUpdate('finalised')

            const processRanEvent = result.events.find(({ event: { method } }) => method === 'ProcessRan')
            const data = processRanEvent?.event?.data as EventData
            const tokens = data?.outputs?.map((x) => x.toNumber())

            unsub()
            tokens ? resolve(tokens) : reject(Error('No token IDs returned'))
          }
        })
        .then((res) => {
          unsub = res
        })
        .catch((err) => {
          transactionDbUpdate('failed')
          this.logger.warn(`Error in run process transaction: ${err}`)
          throw err
        })
    })
  }

  async processRoles(roles: Record<string, string>) {
    if (this.roles.length === 0) {
      this.roles = await this.getRoles()
    }

    return new Map(
      Object.entries(roles).map(([key, v]) => {
        return [this.roleToIndex(key), v]
      })
    )
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

  async getProcessRanEvents(blockhash: string): Promise<ProcessRanEvent[]> {
    await this.api.isReady
    const apiAtBlock = await this.api.at(blockhash)
    const processRanEventIndexes = (await apiAtBlock.query.system.eventTopics(processRanTopic)) as unknown as [
      never,
      number
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
        callHash: block.block.extrinsics[extrinsicIndex].hash.toString(),
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
}
