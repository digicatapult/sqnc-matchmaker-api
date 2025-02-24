import type express from 'express'
import { Env } from '../env.js'
import Identity from '../lib/services/identity.js'
import { getAuthorization } from '../lib/utils/shared.js'

export const determineAddress = async (
  identity: Identity,
  env: Env,
  req: express.Request,
  self: { address: string; alias: string } | null = null
) => {
  let res: {
    address: string
    alias: string
  }
  if (env.PROXY_FOR !== null) {
    res = self || (await identity.getMemberByAddress(env.PROXY_FOR, getAuthorization(req)))
  } else {
    res = self || (await identity.getMemberBySelf(getAuthorization(req)))
  }
  return res
}
