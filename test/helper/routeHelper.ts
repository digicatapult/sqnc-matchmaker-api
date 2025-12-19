import request from 'supertest'
import type express from 'express'
import { scopes } from '../../src/models/scope.js'

export const getToken = async (scope: string = scopes.join(' '), realm: 'member-a' | 'internal' = 'member-a') => {
  const tokenReq = await fetch(`http://localhost:3080/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'test',
      client_secret: 'secret',
      ...(scope ? { scope } : {}),
    }),
  })

  if (!tokenReq.ok) {
    throw new Error(`Error getting token from keycloak ${tokenReq.statusText}`)
  }
  const body = (await tokenReq.json()) as any
  return body.access_token as string
}

export const get = async (
  app: express.Express,
  endpoint: string,
  headers: Record<string, string> = {},
  scope?: string
): Promise<request.Test> => {
  const token = await getToken(scope)
  const headersWithToken = {
    authorization: `bearer ${token}`,
    ...headers,
  }
  return request(app).get(endpoint).set(headersWithToken)
}

export const post = async (
  app: express.Express,
  endpoint: string,
  body: object,
  headers: Record<string, string> = {},
  scope?: string
): Promise<request.Test> => {
  const token = await getToken(scope)
  const headersWithToken = {
    authorization: `bearer ${token}`,
    ...headers,
  }
  return request(app).post(endpoint).send(body).set(headersWithToken)
}

export const postFile = async (
  app: express.Express,
  endpoint: string,
  buf: Buffer,
  filename: string,
  headers: Record<string, string> = { accept: 'application/octect-stream' }
): Promise<request.Test> => {
  const token = await getToken()
  const headersWithToken = {
    authorization: `bearer ${token}`,
    ...headers,
  }
  return request(app).post(endpoint).set(headersWithToken).attach('file', buf, filename)
}

export const postInternal = async (
  app: express.Express,
  endpoint: string,
  body: object,
  headers: Record<string, string> = {}
): Promise<request.Test> => {
  const token = await getToken('', 'internal')
  const headersWithToken = {
    authorization: `bearer ${token}`,
    ...headers,
  }
  return request(app).post(endpoint).send(body).set(headersWithToken)
}
