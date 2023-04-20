import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import env from '../../env'

const { NODE_HOST, NODE_PORT } = env

const provider: WsProvider = new WsProvider(`ws://${NODE_HOST}:${NODE_PORT}`)
const api: ApiPromise = new ApiPromise({ provider })

export const substrateApi: ApiPromise = api
export const keyring: Keyring = new Keyring({ type: 'sr25519' })
