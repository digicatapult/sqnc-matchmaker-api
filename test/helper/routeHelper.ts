import request from 'supertest'
import express from 'express'

import env from '../../src/env.js'

const allScopes =
  'demandA:read demandA:create demandA:comment demandB:read demandB:create demandB:comment match2:read match2:propose match2:cancel match2:accept.reject'

export const getToken = async (clientId: string = env.IDP_CLIENT_ID, scope: string = allScopes) => {
  const tokenReq = await fetch('http://localhost:3080/realms/member-a/protocol/openid-connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
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
  headers: Record<string, string> = {}
): Promise<request.Test> => {
  const token = await getToken()
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
  headers: Record<string, string> = {}
): Promise<request.Test> => {
  const token = await getToken()
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

export const noScopeGet = async (
  app: express.Express,
  endpoint: string,
  headers: Record<string, string> = {}
): Promise<request.Test> => {
  const token = await getToken('test', '')
  const headersWithToken = {
    authorization: `bearer ${token}`,
    ...headers,
  }
  return request(app).get(endpoint).set(headersWithToken)
}

export const noScopePost = async (
  app: express.Express,
  endpoint: string,
  body: object,
  headers: Record<string, string> = {}
): Promise<request.Test> => {
  const token = await getToken('test', '')
  const headersWithToken = {
    authorization: `bearer ${token}`,
    ...headers,
  }
  return request(app).post(endpoint).send(body).set(headersWithToken)
}
