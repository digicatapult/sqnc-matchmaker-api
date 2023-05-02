/**
 * Stringified UUIDv4.
 * @pattern [0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}
 * @format uuid
 */
export type UUID = string

/**
 * Hex string with 0x prefix
 * @pattern 0x[0-9a-zA-Z]+
 * @format hex
 */
export type HEX = `0x${string}`
