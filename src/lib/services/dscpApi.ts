import env from '../../env'
import { HttpResponse } from '../error-handler'

const URL_PREFIX = `http://${env.DSCP_API_HOST}:${env.DSCP_API_PORT}/v3`

export interface RunProcessFile {
  blob: Blob
  filename: string
}

export const runProcess = async ({ files, ...payload }: { files: RunProcessFile[] }) => {
  console.log(JSON.stringify(payload))
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

  throw new HttpResponse({ code: 500, message: result }) // pass through dscpApi error
}
