export interface DemandRecord {
  id: string
  owner?: string
  subtype?: string
  state?: string
  parameters_attachment_id?: string
  latest_token_id?: number
  original_token_id?: number
}

export interface MatchRecord {
  id: string
  optimiser?: string
  member_a?: string
  member_b?: string
  state?: string
  demand_a_id?: string
  demand_b_id?: string
  latest_token_id?: number
  original_token_id?: number
}

export type ChangeSet = {
  demands?: Map<string, DemandRecord>
  matches?: Map<string, MatchRecord>
}

const mergeMaps = <T extends object>(base?: Map<string, T>, update?: Map<string, T>) => {
  if (!update) {
    return base
  }

  const result = base || new Map<string, T>()
  for (const [key, value] of update) {
    const base = result.get(key) || {}
    result.set(key, {
      ...base,
      ...value,
    })
  }

  return result
}

export const mergeChangeSets: (base: ChangeSet, update: ChangeSet) => ChangeSet = (base, update) => {
  const demands = mergeMaps(base.demands, update.demands)
  const matches = mergeMaps(base.matches, update.matches)

  const result: ChangeSet = {
    ...(demands ? { demands } : {}),
    ...(matches ? { matches } : {}),
  }

  return result
}
