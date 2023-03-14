/**
 * Stringified UUIDv4.
 * See [RFC 4112](https://tools.ietf.org/html/rfc4122)
 * @pattern [0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}
 * @format uuid
 */
export type UUID = string

export enum DemandSubtype {
  Order = 'Order',
  Capacity = 'Capacity',
}

export enum DemandStatus {
  Created = 'Created',
  Allocated = 'Allocated',
}

export interface DemandResponse {
  id: UUID
  owner: string
  parametersAttachmentId: UUID
  status: DemandStatus
}

export interface DemandRequest {
  parametersAttachmentId: UUID
}
