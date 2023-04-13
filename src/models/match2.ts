import { UUID } from './uuid'

/**
 * The possible states of a Match2
 */
export type Match2State = 'proposed' | 'acceptedA' | 'acceptedB' | 'acceptedFinal'

/**
 * A Match2 returned by the API
 */
export interface Match2Response {
  id: UUID
  /**
   * The member-set alias of the Optimiser for the Match2
   */
  optimiser: string
  /**
   * The member-set alias of MemberA for the Match2
   */
  memberA: string
  /**
   * The member-set alias of MemberB for the Match2
   */
  memberB: string
  state: Match2State
  demandA: UUID
  demandB: UUID
}

export interface Match2Payload extends Match2Response {
  latestTokenId: number
  originalTokenId: number
}

/**
 * The required properties of a request to create a Match2. demandA is an order. demandB is a capacity.
 */
export interface Match2Request {
  /**
   * ID of the order
   */
  demandA: UUID
  /**
   * ID of the capacity
   */
  demandB: UUID
}
