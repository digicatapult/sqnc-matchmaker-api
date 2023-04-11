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
  files.map((f: RunProcessFile) => formData.append('files', f.blob, f.filename || 'unknown'))

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (res.ok) {
    return await res.json()
  }

  throw new HttpResponse({ code: 500, message: await res.text() }) // pass through dscpApi error
}