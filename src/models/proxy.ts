export type AddProxyRequest = {
  proxyAddress: string
  proxyType: ProxyType
  delay?: number
}

export type ProxyType = 'Any' | 'RunProcess' | 'Governance'
