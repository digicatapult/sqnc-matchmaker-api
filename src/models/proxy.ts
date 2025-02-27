export type ProxyRequest = {
  delegatingAlias: string
  proxyAddress: string
  proxyType: ProxyType
  delay: number
}

export type ProxyType = 'Any' | 'RunProcess' | 'Governance'
