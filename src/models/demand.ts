import { DATE, UUID } from './strings'

/**
 * The possible types of a Demand
 */
export type DemandSubtype = 'demand_a' | 'demand_b'

/**
 * The possible states of a Demand
 */
export type DemandState = 'created' | 'allocated'

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
 * A Demand with comments submitted by other members
 */
export interface DemandWithCommentsResponse extends DemandResponse {
  comments: {
    owner: string
    createdAt: DATE
    attachmentId: string
  }[]
}

/**
 * The required properties of a request to create a Demand
 */
export interface DemandRequest {
  parametersAttachmentId: UUID
}

/**
 * The required properties of the request to make a demand comment
 */
export interface DemandCommentRequest {
  attachmentId: UUID
}
