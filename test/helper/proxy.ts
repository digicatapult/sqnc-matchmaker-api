import { type ProxyType } from '../../src/models/proxy.js'
import ExtendedChainNode from './testInstanceChainNode.js'

const proxyReq = {
  delegatingAlias: '//Dave', // e.g. //Alice
  proxyAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', //e.g. '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'
  proxyType: 'RunProcess' as ProxyType, // better way to do this?
  delay: 0,
}
export async function setupProxy(node: ExtendedChainNode) {
  // Alice is Proxy for Dave == Dave is delegating to Alice
  const extrinsicDave = await node.addProxy(proxyReq)
  await node.submitRunProcessForProxy(extrinsicDave)

  await node.clearAllTransactions()

  // do we need proxys for other personas?
}

export async function removeProxy(node: ExtendedChainNode) {
  const extrinsicDave = await node.removeProxy(proxyReq)
  await node.submitRunProcessForProxy(extrinsicDave)

  await node.clearAllTransactions()
}

export async function withProxy(node: ExtendedChainNode) {
  before(async function () {
    await removeProxy(node)
    await setupProxy(node)
  })
  after(async function () {
    await removeProxy(node)
  })
}
