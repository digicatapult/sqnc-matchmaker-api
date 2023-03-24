import { Attachment } from './attachment'
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

export interface DemandPayload extends DemandResponse, Attachment {
  subtype: DemandSubtype
  binary_blob: Blob
  latestTokenId: number
  originalTokenId: number
}

/**
 * The required properties of a request to create a Demand
 */
export interface DemandRequest {
  parametersAttachmentId: UUID
}
