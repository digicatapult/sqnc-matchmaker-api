import { UUID } from './uuid'

/**
 * File or JSON attachment
 * @example [{
 *   "id": "string",
 *   "filename": "string",
 *   "size": 1024,
 *   "createdAt": "2023-03-16T13:18:42.357Z"
 * }]
 */
export interface Attachment {
  /**
   * uuid generated using knex
   */
  id: UUID
  /**
   * for json files name will be 'json'
   */
  filename: string | 'json'
  size: number
  createdAt: Date
}
