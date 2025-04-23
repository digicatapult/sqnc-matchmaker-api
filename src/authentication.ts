import type express from 'express'

import mkExpressAuthentication, { mergeAcceptAny } from '@digicatapult/tsoa-oauth-express'

import env from './env.js'

const makeAuth = (securityName: string, jwksUri: string) =>
  mkExpressAuthentication({
    verifyOptions: {},
    securityName,
    jwksUri: () => Promise.resolve(jwksUri),
    getAccessToken: (req: express.Request) =>
      Promise.resolve(req.headers['authorization']?.substring('bearer '.length)),
    getScopesFromToken: async (decoded) => {
      const scopes = typeof decoded === 'string' ? '' : `${decoded.scope}`
      return scopes.split(' ')
    },
  })

export const expressAuthentication = mergeAcceptAny([
  makeAuth(
    'oauth2',
    `${env.IDP_INTERNAL_ORIGIN}${env.IDP_PATH_PREFIX}/realms/${env.IDP_OAUTH2_REALM}/protocol/openid-connect/certs`
  ),
  makeAuth(
    'internal',
    `${env.IDP_INTERNAL_ORIGIN}${env.IDP_PATH_PREFIX}/realms/${env.IDP_INTERNAL_REALM}/protocol/openid-connect/certs`
  ),
])
