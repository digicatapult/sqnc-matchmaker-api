import env from '../../env'

const URL_PREFIX = `http://${env.DSCP_API_HOST}:${env.DSCP_API_PORT}/v3`

export interface RunProcessFile {
  blob: Blob
  filename: string
}

export const runProcess = async ({ files, ...payload }: { files: RunProcessFile[] }) => {
  const url = `${URL_PREFIX}/run-process`
  const formData = new FormData()
  console.log(JSON.stringify(payload))

  formData.append('request', JSON.stringify(payload))
  files.map((f: RunProcessFile) => formData.append('files', f.blob, f.filename))

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  return res.json()
}
