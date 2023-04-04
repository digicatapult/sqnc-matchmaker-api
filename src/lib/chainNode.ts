import { ApiPromise, WsProvider, Keyring, SubmittableResult } from '@polkadot/api'
import { Logger } from 'pino'
import { HttpResponse } from './error-handler'

import env from '../env'
import { addFile, MetadataFile } from './services/ipfs'

const { METADATA_KEY_LENGTH, METADATA_VALUE_LITERAL_LENGTH, PROCESS_IDENTIFIER_LENGTH, USER_URI } = env

export interface NodeCtorConfig {
  host: string
  port: number
  logger: Logger
}

export default class ChainNode {
  private provider: WsProvider
  private api: ApiPromise
  private keyring: Keyring
  private logger: Logger
  private roles: { name: string | undefined; index: number | undefined }[]
  private user: any
  private initialised: boolean

  constructor({ host, port, logger }: NodeCtorConfig) {
    this.logger = logger.child({ module: 'ChainNode' })
    this.provider = new WsProvider(`ws://${host}:${port}`)
    this.api = new ApiPromise({ provider: this.provider })
    this.keyring = new Keyring({ type: 'sr25519' })
    this.roles = []
    this.initialised = false

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

  async init() {
    if (!this.initialised) {
      this.roles = await this.getRoles()
      this.user = this.keyring.addFromUri(USER_URI)
      this.initialised = true
    }
  }

  async getLastFinalisedBlockHash(): Promise<string> {
    const result = await this.api.rpc.chain.getFinalizedHead()
    return result.toHex()
  }

  async getHeader(hash: string): Promise<{ hash: string; height: number; parent: string }> {
    const result = await this.api.rpc.chain.getHeader(hash)
    return {
      hash: result.toHex(),
      height: result.number.toNumber(),
      parent: result.parentHash.toHex(),
    }
  }

  async getRoles() {
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

    if (!entry) {
      throw new Error(`Invalid role: ${role}`)
    }

    return entry.index
  }

  async runProcess(payload: any): Promise<number[]> {
    await this.init()
    await this.api.isReady

    console.log(payload)
    const process = { id: utf8ToHex(payload.process.id, PROCESS_IDENTIFIER_LENGTH), version: payload.process.version }
    const inputs = payload.inputs
    const outputs = await Promise.all(
      payload.outputs.map(async (output: any) => ({
        roles: this.processRoles(output.roles),
        metadata: await this.processMetadata(output.metadata),
      }))
    )
    console.log(process)
    console.log(payload.inputs)
    console.log(outputs)
    const relevantOutputs = outputs.map(({ roles, metadata }) => [roles, metadata])

    this.logger.debug('Running Transaction inputs: %j outputs: %j', inputs, relevantOutputs)

    return new Promise((resolve, reject) => {
      let unsub: any = null
      this.api.tx.simpleNFT
        .runProcess(process, inputs, relevantOutputs)
        .signAndSend(this.user, (result: SubmittableResult) => {
          this.logger.debug('result.status %s', JSON.stringify(result.status))
          this.logger.debug('result.status.isInBlock', result.status.isInBlock)
          const { dispatchError, events, status } = result
          console.log(outputs)
          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = this.api.registry.findMetaError(dispatchError.asModule)
              reject(new HttpResponse({ message: `Node dispatch error: ${decoded.name}` }))
            } else {
              reject(Error(dispatchError.toString()))
            }
          }

          if (status.isInBlock) {
            const errors = events
              .filter(({ event: { method } }) => method === 'ExtrinsicFailed')
              .map(({ event: { data } }) => data[0])

            if (errors.length > 0) {
              reject(this.processExtrinsicError(errors[0]))
            }

            const processRanEvent = result.events.find(({ event: { method } }) => method === 'ProcessRan')
            const data: any = processRanEvent?.event?.data
            console.log(data)
            const tokens = data?.outputs?.map((x: any) => x.toNumber())
            console.log(tokens)

            unsub()
            resolve(tokens)
          }
        })
        .then((res) => {
          unsub = res
        })
        .catch((err) => {
          this.logger.warn(`Error in run process transaction: ${err}`)
          throw err
        })
    })
  }

  processRoles(roles: any) {
    return new Map(
      Object.entries(roles).map(([key, v]) => {
        return [this.roleToIndex(key), v]
      })
    )
  }

  async processMetadata(metadata: Record<string, { type: string; value: string | MetadataFile }>) {
    const metadataItems = Object.entries(metadata)

    const maps = await Promise.all(
      metadataItems.map(async ([key, value]) => {
        const keyAsUint8Array = utf8ToHex(key, METADATA_KEY_LENGTH)

        let processedValue
        switch (value.type) {
          case 'LITERAL':
            processedValue = { Literal: utf8ToHex(value.value as string, METADATA_VALUE_LITERAL_LENGTH) }
            break
          case 'TOKEN_ID':
            processedValue = { TokenId: value.value as string }
            break
          case 'FILE':
            processedValue = { File: await addFile(value.value as MetadataFile) }
            break
          default:
          case 'NONE':
            processedValue = { None: null }
            break
        }
        return new Map([[keyAsUint8Array, processedValue]])
      })
    )
    const result = new Map()
    maps.forEach((map) => {
      map.forEach((value, key) => {
        result.set(key, value)
      })
    })
    return result
  }

  processExtrinsicError = (error: any) => {
    if (!error.isModule) {
      return new HttpResponse({ message: 'Unknown runProcess error' })
    }

    const decoded = this.api.registry.findMetaError(error.asModule)
    return new HttpResponse({ message: `runProcess error: ${decoded.name}` })
  }
}

const utf8ToHex = (str: string, len: number) => {
  const buffer = Buffer.from(str, 'utf8')
  const bufferHex = buffer.toString('hex')
  if (bufferHex.length > 2 * len) {
    throw new Error(`${str} is too long. Max length: ${len} bytes`)
  }
  return `0x${bufferHex}`
}

// export interface RunProcessFile {
//   blob: Blob
//   filename: string
// }

// interface Payload {
//   files: RunProcessFile[]
//   process: object
//   inputs: number[]
//   outputs: Output[]
// }

// interface Output {
//   roles: Record<string, string | undefined>
//   metadata:
// }
