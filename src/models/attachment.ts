import { UUID } from './uuid'

/**
 * File or JSON attachment
 * @example [{
 *   "id": "string",
 *   "filename": "string",
 *   "binary_blob": {
 *     "size": 0,
 *     "type": "string"
 *   },
 *   "datetime": "2023-03-16T13:18:42.357Z"
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
  binary_blob: Blob
  datetime: Date
}
