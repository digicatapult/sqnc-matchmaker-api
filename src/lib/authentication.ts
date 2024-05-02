import * as express from 'express'

import jwt from 'jsonwebtoken'
import jwksRsa from 'jwks-rsa'
import { Forbiden, Unauthorized } from './error-handler/index.js'

/**
 *
 * @param request - express.Request
 * @param securityName - string representing...
 * @param scopes
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export function expressAuthentication(
  request: express.Request,
  securityName: 'oauth2'
  // scopes?: string[]
): Promise<jwt.Jwt> {
  const token = request.headers['authorization']
  if (securityName !== 'oauth2' || !token) {
    console.log(token)
    throw new Unauthorized(securityName)
  }

  const client: jwksRsa.JwksClient = jwksRsa({
    jwksUri: 'http://localhost:3080/auth/realms/simple/protocol/openid-connect/certs',
    cache: true,
    timeout: 60000,
    requestHeaders: { 'node-name': 'paulius' }, // Optional
  })

  const getKey: jwt.GetPublicKeyOrSecret = (header: jwt.JwtHeader, callback: jwt.SignCallback) => {
    client.getSigningKey(
      'LmJlcmrSpP4T0cDi5yyTNl95i4buzzuQi_Lxm05b0wg',
      (err: Error | null, key: jwksRsa.JSONWebKey | undefined) => {
        console.log({ header, key })
        if (err) throw new Unauthorized(err.toString())

        callback(null, key!.getPublicKey())
      }
    )
  }

  return new Promise((resolve): void => {
    return jwt.verify(token, getKey, function (err: Error | null, decoded: any) {
      console.log(err)
      if (err) throw new Forbiden()

      return resolve(decoded)
    })
  })
}
