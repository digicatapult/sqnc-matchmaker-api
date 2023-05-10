import { DATE, UUID } from './strings'

/**
 * The possible states of a Match2
 */
export type Match2State = 'pending' | 'proposed' | 'acceptedA' | 'acceptedB' | 'acceptedFinal'

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
  createdAt: DATE
  updatedAt: DATE
}

/**
 * The required properties of a request to create a Match2
 */
export interface Match2Request {
  /**
   * ID of the demandA
   */
  demandA: UUID
  /**
   * ID of the demandB
   */
  demandB: UUID
}
