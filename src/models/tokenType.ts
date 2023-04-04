/**
 * The possible on-chain token types
 */

export const DEMAND = 'DEMAND' as const
export const MATCH2 = 'MATCH2' as const
export type TOKEN_TYPE = typeof DEMAND | typeof MATCH2
