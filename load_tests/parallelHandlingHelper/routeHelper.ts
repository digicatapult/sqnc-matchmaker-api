import env from '../../src/env.js'

export const getToken = async () => {
  const tokenReq = await fetch(`http://keycloak:8080/realms/member-a/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.IDP_CLIENT_ID,
      client_secret: 'secret',
    }),
  })

  if (!tokenReq.ok) {
    throw new Error(`Error getting token from keycloak ${tokenReq.statusText}`)
  }

  const body = (await tokenReq.json()) as any
  console.log('string before the body', body)
  return body.access_token as string
}
