import { DATE, UUID } from './strings'

/**
 * The possible types of a Demand
 */
export type DemandSubtype = 'demand_a' | 'demand_b'

/**
 * The possible states of a Demand
 */
export type DemandState = 'pending' | 'created' | 'allocated'

/**
 * A Demand returned by the API
 */
export interface DemandResponse {
  id: UUID
  /**
   * The member-set alias of the account that owns the Demand
   */
  owner: string
  parametersAttachmentId: UUID
  state: DemandState
  createdAt: DATE
  updatedAt: DATE
}

/**
 * The required properties of a request to create a Demand
 */
export interface DemandRequest {
  parametersAttachmentId: UUID
}
