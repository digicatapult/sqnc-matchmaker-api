import * as express from 'express'
import * as jwt from 'jsonwebtoken'
import jwksRsa from 'jwks-rsa'

type _Obj = { [k: string]: string }

/* eslint-disable @typescript-eslint/no-unused-vars */
export function expressAuthentication(
  request: express.Request,
  securityName: string
  // scopes?: string[]
): any {
  if (securityName === 'auth0') {
    const token = request.headers['authorization']
    if (!token) {
      throw new Error('No token provided')
    }

    const client: jwksRsa.JwksClient = jwksRsa({
      cache: true,
      jwksUri: 'https://<TODO>.eu.auth0.com/.well-known/jwks.json',
    })

    const getKey = (header: any, callback: any) => {
      client.getSigningKey(header.kid, function (err: any, key: any) {
        const signingKey = key.publicKey || key.rsaPublicKey
        callback(null, signingKey)
      })
    }

    jwt.verify(token, getKey, function (err: any, decoded: any) {
      if (err) throw new Error(err.message)
      console.log({ decoded })

      return decoded
    })
  }

  throw new Error('403 - error validating token')
}
