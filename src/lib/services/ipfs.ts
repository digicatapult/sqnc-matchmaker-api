import basex from 'base-x'

import { logger } from '../logger'
import env from '../../env'
import type { MetadataFile } from '../payload'
import { HttpResponse } from '../error-handler'

const { IPFS_HOST, IPFS_PORT } = env
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const bs58 = basex(BASE58)

const log = logger.child({ module: 'ipfs' })

export const addFile = async ({ blob, filename }: MetadataFile): Promise<string> => {
  log.debug('Uploading file %s', filename)
  const form = new FormData()
  form.append('file', blob, filename)
  const res = await fetch(`http://${IPFS_HOST}:${IPFS_PORT}/api/v0/add?cid-version=0&wrap-with-directory=true`, {
    method: 'POST',
    body: form,
  })

  const text = await res.text()

  if (!res.ok) {
    throw new HttpResponse({ code: 500, message: text })
  }

  // Build string of objects into array
  const json = text
    .split('\n')
    .filter((obj) => obj.length > 0)
    .map((obj) => JSON.parse(obj))

  const hash = formatHash(json)
  logger.debug('Upload of file %s succeeded. Hash is %s', filename, hash)
  return hash
}

const formatHash = (filestoreResponse: any) => {
  // directory has no Name
  const dir: any = filestoreResponse.find((r: any) => r.Name === '')
  if (dir && dir.Hash && dir.Size) {
    const decoded = Buffer.from(bs58.decode(dir.Hash))
    return `0x${decoded.toString('hex').slice(4)}`
  } else {
    throw new Error()
  }
}
