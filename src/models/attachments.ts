/**
 * File or JSON attachments
 */
export interface Attachments {
  id?: string
  /**
   * for json files name will be 'json'
   */
  filename: string | 'json'
  binary_blob: Blob
  datetime: Date
}
