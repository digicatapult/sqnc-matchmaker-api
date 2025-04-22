import { ADDRESS, UUID } from './strings.js'

export interface AuthorizationRequest {
  input: {
    resourceType: 'attachment'
    resourceId: UUID
    accountAddress: ADDRESS
  }
}

export interface AuthorizationResponse {
  result: {
    allowed: true
  }
}
