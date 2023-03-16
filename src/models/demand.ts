import { Attachments } from './attachments'
import { UUID } from './uuid'

/**
 * The possible types of a Demand
 */
export enum DemandSubtype {
  Order = 'Order',
  Capacity = 'Capacity',
}

/**
 * The possible states of a Demand
 */
export enum DemandStatus {
  Created = 'Created',
  Allocated = 'Allocated',
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
  status: DemandStatus
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
