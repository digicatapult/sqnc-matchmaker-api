import * as envalid from 'envalid'
import dotenv from 'dotenv'

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })
} else if (process.env.NODE_ENV === 'proxyless') {
  dotenv.config({ path: 'test/proxyless.test.env' })
} else {
  dotenv.config()
}

const env = envalid.cleanEnv(process.env, {
  PORT: envalid.port({ default: 3000 }),
  LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
  DB_HOST: envalid.str({ devDefault: 'localhost' }),
  DB_PORT: envalid.port({ default: 5432 }),
  DB_USERNAME: envalid.str({ devDefault: 'postgres' }),
  DB_PASSWORD: envalid.str({ devDefault: 'postgres' }),
  DB_NAME: envalid.str({ default: 'sqnc-matchmaker-api' }),
  IDENTITY_SERVICE_HOST: envalid.host({ devDefault: 'localhost' }),
  IDENTITY_SERVICE_PORT: envalid.port({ devDefault: 3002, default: 3000 }),
  ATTACHMENT_SERVICE_HOST: envalid.host({ devDefault: 'localhost' }),
  ATTACHMENT_SERVICE_PORT: envalid.port({ devDefault: 3003, default: 3000 }),
  NODE_HOST: envalid.host({ default: 'localhost' }),
  NODE_PORT: envalid.port({ default: 9944 }),
  ENABLE_INDEXER: envalid.bool({ default: true }),
  USER_URI: envalid.str({ devDefault: '//Alice' }),
  PROXY_FOR: envalid.str({ devDefault: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' }), // Default Bob (NOTE: you need to manually set up the proxy on chain, if you don't want to use this feature, set to '')
  WATCHER_POLL_PERIOD_MS: envalid.num({ default: 10 * 1000 }),
  WATCHER_TIMEOUT_MS: envalid.num({ default: 2 * 1000 }),
  INDEXER_TIMEOUT_MS: envalid.num({ default: 30 * 1000 }),
  API_SWAGGER_BG_COLOR: envalid.str({ default: '#fafafa' }),
  API_SWAGGER_TITLE: envalid.str({ default: 'MatchmakerAPI' }),
  API_SWAGGER_HEADING: envalid.str({ default: 'MatchmakerAPI' }),
  IDP_CLIENT_ID: envalid.str({ devDefault: 'sequence' }),
  IDP_INTERNAL_CLIENT_ID: envalid.str({ devDefault: 'sequence' }),
  IDP_INTERNAL_CLIENT_SECRET: envalid.str({ devDefault: 'secret' }),
  IDP_PUBLIC_ORIGIN: envalid.url({
    devDefault: 'http://localhost:3080',
  }),
  IDP_INTERNAL_ORIGIN: envalid.url({
    devDefault: 'http://localhost:3080',
  }),
  IDP_PATH_PREFIX: envalid.str({
    default: '/auth',
    devDefault: '',
  }),
  IDP_OAUTH2_REALM: envalid.str({
    devDefault: 'member-a',
  }),
  IDP_INTERNAL_REALM: envalid.str({
    devDefault: 'internal',
  }),
  INDEXER_RETRY_DELAY: envalid.num({ default: 1000 }),
})

export default env

export const EnvToken = Symbol('Env')
export type Env = typeof env
