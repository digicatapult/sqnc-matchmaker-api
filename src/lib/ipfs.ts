import basex from 'base-x'
import { Logger } from 'pino'

import type { MetadataFile } from './payload'
import { HttpResponse } from './error-handler'

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const bs58 = basex(BASE58)

interface FilestoreResponse {
  Name: string
  Hash: string
  Size: string
}

export default class Ipfs {
  private url: string
  private logger: Logger

  constructor({ host, port, logger }: { host: string; port: number; logger: Logger }) {
    this.url = `http://${host}:${port}/api/v0/add?cid-version=0&wrap-with-directory=true`
    this.logger = logger.child({ module: 'ipfs' })
  }

  async addFile({ blob, filename }: MetadataFile): Promise<string> {
    this.logger.debug('Uploading file %s', filename)
    const form = new FormData()
    form.append('file', blob, filename)
    const res = await fetch(this.url, {
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
    this.logger.debug('Upload of file %s succeeded. Hash is %s', filename, hash)
    return hash
  }
}

const formatHash = (filestoreResponse: FilestoreResponse[]) => {
  // directory has no Name
  const dir = filestoreResponse.find((r) => r.Name === '')
  if (dir && dir.Hash && dir.Size) {
    const decoded = Buffer.from(bs58.decode(dir.Hash))
    return `0x${decoded.toString('hex').slice(4)}`
  } else {
    throw new HttpResponse({ code: 500, message: 'ipfs failed to make directory' })
  }
}
