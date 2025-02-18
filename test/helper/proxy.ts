import ChainNode from '../../src/lib/chainNode'
import { ProxyController } from '../../src/controllers/v1/proxy/index.js'

export async function setupProxy(node: ChainNode) {
  const proxyController = new ProxyController(node)
  // Alice is Proxy for Dave
  await proxyController.createProxyOnChain('//Dave', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
  await node.sealBlock()
  // Proxy for Bob is Eve
  // await proxyController.createProxyOnChain('//Bob', '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw')
  // await node.sealBlock()

  // Proxy for Charlie is Ferdie
  // await proxyController.createProxyOnChain('//Charlie', '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL')
  // await node.sealBlock()
}
