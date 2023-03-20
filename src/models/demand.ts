import { Attachments } from './attachments'
import { UUID } from './uuid'

/**
 * The possible types of a Demand
 */
export enum DemandSubtype {
  order = 'order',
  capacity = 'capacity',
}

/**
 * The possible states of a Demand
 */
export enum DemandState {
  created = 'created',
  allocated = 'allocated',
}

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
}

export interface Demand extends DemandResponse, Attachments {
  subtype: DemandSubtype
  latestTokenId: number
  originalTokenId: number
  created_at: Date
  updated_at: Date
}

/**
 * The required properties of a request to create a Demand
 */
export interface DemandRequest {
  parametersAttachmentId: UUID
}
