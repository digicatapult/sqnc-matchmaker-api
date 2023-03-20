import Database from '../../src/lib/db'
import { DemandStatus, DemandSubtype } from '../../src/models/demand'
import { selfAddress } from '../helper/mock'

const db = new Database().db()

export const cleanup = async () => {
  await db.attachments().del()
  await db.demand().del()
}

export const parametersAttachmentId = 'a789ad47-91c3-446e-90f9-a7c9b233eaf8'
export const seededCapacityId = '0f5af074-7d4d-40b4-86a5-17a2391303cb'

export const seed = async () => {
  await cleanup()

  await db.attachments().insert([
    {
      id: parametersAttachmentId,
      filename: 'test.txt',
      binary_blob: 9999999,
    },
  ])

  await db.demand().insert([
    {
      id: seededCapacityId,
      owner: selfAddress,
      subtype: DemandSubtype.capacity,
      status: DemandStatus.created,
      parameters_attachment_id: parametersAttachmentId,
    },
  ])
}
