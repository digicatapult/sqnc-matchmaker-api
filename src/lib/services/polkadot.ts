import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'

import { HttpResponse } from '../error-handler'
import env from '../../env'
import { logger } from '../logger'

const log = logger.child({ module: 'polkadot' })

const { NODE_HOST, NODE_PORT } = env

const provider = new WsProvider(`ws://${NODE_HOST}:${NODE_PORT}`)
export const api = new ApiPromise({ provider })

api.isReadyOrError.catch() // prevent unhandled promise rejection errors

api.on('disconnected', () => {
  log.warn(`Disconnected from substrate node at ${NODE_HOST}:${NODE_PORT}`)
})

api.on('connected', () => {
  log.info(`Connected to substrate node at ${NODE_HOST}:${NODE_PORT}`)
})

api.on('error', (err) => {
  log.error(`Error from substrate node connection. Error was ${err.message || JSON.stringify(err)}`)
})

export const keyring = new Keyring({ type: 'sr25519' })

export interface RunProcessFile {
  blob: Blob
  filename: string
}

interface Payload {
  files: RunProcessFile[]
  process: object
  inputs: number[]
  outputs: Output[]
}

interface Output {
  roles: Record<string, string | undefined>
  metadata: Record<string, { type: string; value?: string }>
}

export const runProcess = async ({ files, process, inputs, outputs }: Payload) => {
  //const formData = new FormData()
  console.log(files)
  console.log(process)
  console.log(inputs)
  //formData.append('request', JSON.stringify(payload))
  //files.map((f: RunProcessFile) => formData.append('files', f.blob, f.filename))
  outputs.map(({ roles }) => processRoles(roles))
  return [0]

  throw new HttpResponse({ code: 500, message: '' })
}

const processRoles = async (roles: Output['roles']) => {
  Object.entries(roles).map(async ([key, v]) => {
    return [await roleToIndex(key), v]
  })
}
const roleToIndex = async (role: string) => {
  await api.isReady
  const registry = api.registry
  //const lookup = registry.lookup
  const lookupId = registry.getDefinition('DscpNodeRuntimeRole')
  console.log(lookupId)
  console.log(role)

  // const rolesEnum = lookup.getTypeDef(lookupId).sub

  // const entry = rolesEnum?.find((e) => e.name === role)

  // if (!entry) {
  //   throw new HttpResponse({ code: 500, message: `Invalid role: ${role}` })
  // }

  //return entry.index
  return lookupId
}
