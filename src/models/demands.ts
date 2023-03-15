import { UUID } from './uuid'

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
