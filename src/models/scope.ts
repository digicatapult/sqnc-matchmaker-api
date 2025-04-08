export const scopes = [
  'demandA:read',
  'demandA:prepare',
  'demandA:create',
  'demandA:comment',
  'demandB:read',
  'demandB:prepare',
  'demandB:create',
  'demandB:comment',
  'match2:read',
  'match2:prepare',
  'match2:propose',
  'match2:cancel',
  'match2:accept',
  'match2:reject',
] as const

export type Scope = (typeof scopes)[number]
