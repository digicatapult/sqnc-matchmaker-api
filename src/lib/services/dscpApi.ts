import env from '../../env'
import { HttpResponse } from '../error-handler'

const URL_PREFIX = `http://${env.DSCP_API_HOST}:${env.DSCP_API_PORT}/v3`

export interface RunProcessFile {
  blob: Blob
  filename: string
}

export const runProcess = async ({ files, ...payload }: { files: RunProcessFile[] }) => {
  const url = `${URL_PREFIX}/run-process`
  const formData = new FormData()

  formData.append('request', JSON.stringify(payload))
  files.map((f: RunProcessFile) => formData.append('files', f.blob, f.filename))

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  })
  const result = await res.json()

  if (res.ok) {
    return result
  }

  throw new HttpResponse({ code: 422, message: result }) // pass through dscpApi error
}

export const lastTokenId = async () => {
  const res = await fetch(`${URL_PREFIX}/last-token`)

  if (res.ok) {
    const id = await res.json()
    return id
  }

  throw new HttpResponse({})
}

export const getItemById = async (tokenId: number) => {
  const res = await fetch(`${URL_PREFIX}/item/${tokenId}`)

  if (res.ok) {
    const item = await res.json()
    return item
  }

  throw new HttpResponse({})
}
