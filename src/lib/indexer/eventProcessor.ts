import { ChangeSet } from './changeSet'

const processNames = ['demand-create', 'match2-propose', 'match2-accept', 'match2-acceptFinal'] as const
type PROCESSES_TUPLE = typeof processNames
type PROCESSES = PROCESSES_TUPLE[number]

const processNameSet: Set<string> = new Set(processNames)

export const ValidateProcessName = (name: string): name is PROCESSES => processNameSet.has(name)

export type EventProcessors = {
  [key in PROCESSES]: (version: number) => ChangeSet
}

const DefaultEventProcessors: EventProcessors = {
  'demand-create': () => ({}),
  'match2-accept': () => ({}),
  'match2-acceptFinal': () => ({}),
  'match2-propose': () => ({}),
}

export default DefaultEventProcessors
