import { ApiPromise, WsProvider, Keyring, SubmittableResult } from '@polkadot/api'
import { blake2AsHex } from '@polkadot/util-crypto'
import { ApiDecoration, SubmittableExtrinsic } from '@polkadot/api/types'
import type { u128, Vec } from '@polkadot/types'
import type { CallHash } from '@polkadot/types/interfaces/runtime'
import type { EventId } from '@polkadot/types/interfaces/system'

import { Logger } from 'pino'
import { TransactionState } from '../models/transaction'
import { HttpResponse } from './error-handler'
import type { SignedBlock } from '@polkadot/types/interfaces/runtime'
import type { AugmentedQueries } from '@polkadot/api/types'
import type { Codec } from '@polkadot/types-codec/types'

import Ipfs from './ipfs'
import type { Payload, Output, MetadataFile, Metadata } from './payload'
import type { DscpNodeRuntimeRole ,FrameSystemEventRecord, DscpPalletTraitsProcessFullyQualifiedId } from '@polkadot/types/lookup'
import { u32 } from '@polkadot/types-codec'
import { Registry } from '@polkadot/types/types'
import { ILookup } from '@polkadot/types-create/types'

const processRanTopic = blake2AsHex('utxoNFT.ProcessRan')
// const a: __AugmentedQuery<'promise'> = {}

export interface NodeCtorConfig {
  host: string
  port: number
  logger: Logger
  userUri: string
  ipfsHost: string
  ipfsPort: number
}

export interface ProcessRanEvent {
  callHash: CallHash,
  sender: DscpNodeRuntimeRole
  process: DscpPalletTraitsProcessFullyQualifiedId
  inputs: u128
  outputs: Vec<u128>
}

interface RoleEnum {
  name: string | undefined  /* TYPE */ 
  index: number | undefined  /* TYPE */ 
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
  private ipfs: Ipfs

  constructor({ host, port, logger, userUri, ipfsHost, ipfsPort }: NodeCtorConfig) {
    this.logger = logger.child({ module: 'ChainNode' })
    this.provider = new WsProvider(`ws://${host}:${port}`)
    this.userUri = userUri
    this.api = new ApiPromise({ provider: this.provider })
    this.keyring = new Keyring({ type: 'sr25519' })
    this.roles = []
    this.ipfs = new Ipfs({ host: ipfsHost, port: ipfsPort, logger })

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

    const registry: Registry = this.api.registry
    const lookup /*: ILookup */ = registry.lookup as unknown as ILookup// TODO not sure if this is error or not, might be just linting
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
        await this.processMetadata(output.metadata),
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
    transactionDbUpdate: (state: TransactionState) => Promise<void> /* TYPE */
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

  async processMetadata(metadata: Metadata) {
    return new Map(
      await Promise.all(
        Object.entries(metadata).map(async ([key, value]) => {
          let processedValue
          switch (value.type) {
            case 'LITERAL':
              processedValue = { Literal: value.value as string }
              break
            case 'TOKEN_ID':
              processedValue = { TokenId: value.value as string }
              break
            case 'FILE':
              processedValue = { File: await this.ipfs.addFile(value.value as MetadataFile) }
              break
            default:
            case 'NONE':
              processedValue = { None: null }
              break
          }

          return [key, processedValue] as readonly [unknown, unknown]
        })
      )
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
    const apiAtBlock: ApiDecoration<'promise'> = await this.api.at(blockhash)
    const processRanEventIndexes = await apiAtBlock.query.system.eventTopics(processRanTopic) as unknown as Codec
    if (Array.isArray(processRanEventIndexes) && processRanEventIndexes.length === 0) {
      return []
    }

    const block: SignedBlock = await this.api.rpc.chain.getBlock(blockhash)
    const events: AugmentedQueries<'promise'> = await apiAtBlock.query.system.events()

    // TODO need help here with .map / codec - could not figure out
    return processRanEventIndexes.map(([, index]: [unknown, EventId]) => {
      const event: FrameSystemEventRecord = events[index]
      const extrinsicIndex: u32 = event.phase.asApplyExtrinsic
      const process = event.event.data[1] as unknown as DscpPalletTraitsProcessFullyQualifiedId

      return {
        callHash: block.block.extrinsics[extrinsicIndex as unknown as number].hash.toString(),
        sender: event.event.data[0].toString(),
        process: {
          id: Buffer.from(process.id).toString('ascii'),
          version: process.version.toNumber(),
        },
        inputs: event.event.data[2],
        outputs: event.event.data[3],
      }
    })
  }
}
