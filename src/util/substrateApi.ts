import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import env from '../../src/env'
import { logger } from '../lib/logger'

const { NODE_HOST, NODE_PORT } = env

const provider: WsProvider = new WsProvider(`ws://${NODE_HOST}:${NODE_PORT}`)
const api: ApiPromise = new ApiPromise({ provider })

api.isReadyOrError.catch((error) => {
  logger.emit('Error: ' + error)
})

api.on('disconnected', () => {
  logger.warn(`Disconnected from substrate node at ${NODE_HOST}:${NODE_PORT}`)
})

api.on('connected', () => {
  logger.info(`Connected to substrate node at ${NODE_HOST}:${NODE_PORT}`)
})

api.on('error', (err) => {
  logger.error(`Error from substrate node connection. Error was ${err.message || JSON.stringify(err)}`)
})

export const substrateApi: ApiPromise = api
export const keyring: Keyring = new Keyring({ type: 'sr25519' })
