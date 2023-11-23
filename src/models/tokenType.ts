/**
 * The possible on-chain token types
 */

export const DEMAND = 'Demand' as const
export const MATCH2 = 'Match2' as const
export type TOKEN_TYPE = typeof DEMAND | typeof MATCH2
