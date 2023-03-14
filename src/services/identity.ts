import { NotFoundError, HttpResponseError } from '../lib/error-handler'
import env from '../env'

const URL_PREFIX = `http://${env.IDENTITY_SERVICE_HOST}:${env.IDENTITY_SERVICE_PORT}/v1`

const getMemberByAlias = async (alias: string) => {
  const res = await fetch(`${URL_PREFIX}/members/${encodeURIComponent(alias)}`)

  if (res.ok) {
    const member = await res.json()
    return member
  }

  if (res.status === 404) {
    throw new NotFoundError(`Member "${alias}" does not exist`)
  }

  throw new HttpResponseError({})
}

const getMemberBySelf = async () => {
  const res = await fetch(`${URL_PREFIX}/self`)

  if (res.ok) {
    const member = await res.json()
    return member.address
  }

  throw new HttpResponseError({})
}

const getMemberByAddress = (alias: string) => getMemberByAlias(alias)

export { getMemberByAlias, getMemberByAddress, getMemberBySelf }
