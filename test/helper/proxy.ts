import ChainNode from '../../src/lib/chainNode.js'
import { type ProxyType } from '../../src/models/proxy.js'

const proxyReq = {
  delegatingAlias: '//Dave', // e.g. //Alice
  proxyAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', //e.g. '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'
  proxyType: 'RunProcess' as ProxyType, // better way to do this?
  delay: 0,
}
export async function setupProxy(node: ChainNode) {
  // Alice is Proxy for Dave == Dave is delegating to Alice
  const extrinsicDave = await node.addProxy(proxyReq)
  await node.submitRunProcessForProxy(extrinsicDave)

  await node.clearAllTransactions()

  // do we need proxys for other personas?
  // Eve delegating to Bob
  // const extrinsicEve = await node.addProxy(
  //   '//Eve', // e.g. //Alice
  //   '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', //e.g. '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'
  //   'RunProcess',
  //   0
  // )
  // await node.submitRunProcessForProxy(extrinsicEve)

  // await node.sealBlock()
}

export async function removeProxy(node: ChainNode) {
  // Alice is Proxy for Dave == Dave is delegating to Alice
  const extrinsicDave = await node.removeProxy(proxyReq)
  await node.submitRunProcessForProxy(extrinsicDave)

  await node.clearAllTransactions()
}

export async function withProxy(node: ChainNode) {
  before(async function () {
    // does this throw an error?
    // apparently mocha will skip after hooks if the before hook fails
    await removeProxy(node)
    await setupProxy(node)
  })
  after(async function () {
    await removeProxy(node)
    console.log('in after')
  })
}
