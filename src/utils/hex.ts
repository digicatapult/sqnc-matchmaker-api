import basex from 'base-x'

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const bs58 = basex(BASE58)

export const bs58ToHex = (hash: string) => {
  const decoded = Buffer.from(bs58.decode(hash))
  return `0x${decoded.toString('hex').slice(4)}` //remove 1220 prefix
}

export const hexToBs58 = (hex: string) => {
  const stripped = hex.startsWith('0x') ? hex.slice(2) : hex
  const buffer = Buffer.from(`1220${stripped}`, 'hex')
  return bs58.encode(buffer)
}
