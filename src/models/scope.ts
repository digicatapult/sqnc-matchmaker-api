import type express from 'express'

export const scopes = [
  'demandA:read',
  'demandA:create',
  'demandA:comment',
  'demandB:read',
  'demandB:create',
  'demandB:comment',
  'match2:read',
  'match2:propose',
  'match2:cancel',
  'match2:accept',
  'match2:reject',
] as const

export type Scope = (typeof scopes)[number]

export interface ScopedRequest extends express.Request {
  user: {
    jwt: {
      scope?: string
    }
  }
}
