# sqnc-matchmaker-api

## Description

An API facilitating a distributed heterogeneous pairwise matchmaking service utilising Digital Catapult's [Sequence](https://github.com/digicatapult/sqnc-documentation) (SQNC) ledger-based solution

## Configuration

Use a `.env` at root of the repository to set values for the environment variables defined in `.env` file.

| variable                   | required |                      default                       | description                                                                                                                                                                                                                                                                                    |
| :------------------------- | :------: | :------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PORT                       |    N     |                       `3000`                       | The port for the API to listen on                                                                                                                                                                                                                                                              |
| LOG_LEVEL                  |    N     |                      `debug`                       | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`]                                                                                                                                                                                                           |
| ENVIRONMENT_VAR            |    N     |                     `example`                      | An environment specific variable                                                                                                                                                                                                                                                               |
| DB_PORT                    |    N     |                       `5432`                       | The port for the database                                                                                                                                                                                                                                                                      |
| DB_HOST                    |    Y     |                         -                          | The database hostname / host                                                                                                                                                                                                                                                                   |
| DB_NAME                    |    N     |               `sqnc-matchmaker-api `               | The database name                                                                                                                                                                                                                                                                              |
| DB_USERNAME                |    Y     |                         -                          | The database username                                                                                                                                                                                                                                                                          |
| DB_PASSWORD                |    Y     |                         -                          | The database password                                                                                                                                                                                                                                                                          |
| IDENTITY_SERVICE_HOST      |    Y     |                         -                          | Hostname of the `sqnc-identity-service`                                                                                                                                                                                                                                                        |
| IDENTITY_SERVICE_PORT      |    N     |                       `3000`                       | Port of the `sqnc-identity-service`                                                                                                                                                                                                                                                            |
| NODE_HOST                  |    Y     |                         -                          | The hostname of the `sqnc-node` the API should connect to                                                                                                                                                                                                                                      |
| NODE_PORT                  |    N     |                       `9944`                       | The port of the `sqnc-node` the API should connect to                                                                                                                                                                                                                                          |
| LOG_LEVEL                  |    N     |                       `info`                       | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`]                                                                                                                                                                                                           |
| USER_URI                   |    Y     |                         -                          | The Substrate `URI` representing the private key to use when making `sqnc-node` transactions                                                                                                                                                                                                   |
| ATTACHMENT_SERVICE_HOST    |    Y     |                         -                          | Hostname of the `sqnc-attachment-api` to use for metadata storage                                                                                                                                                                                                                              |
| ATTACHMENT_SERVICE_PORT    |    N     |                       `3000`                       | Port of the `sqnc-attachment-api` to use for metadata storage                                                                                                                                                                                                                                  |
| WATCHER_POLL_PERIOD_MS     |    N     |                      `10000`                       | Number of ms between polling of service state                                                                                                                                                                                                                                                  |
| WATCHER_TIMEOUT_MS         |    N     |                       `2000`                       | Timeout period in ms for service state                                                                                                                                                                                                                                                         |
| INDEXER_TIMEOUT_MS         |    N     |                      `30000`                       | Timeout period in ms for service state                                                                                                                                                                                                                                                         |
| API_SWAGGER_BG_COLOR       |    N     |                     `#fafafa`                      | CSS \_color\* val for UI bg ( try: [e4f2f3](https://coolors.co/e4f2f3) , [e7f6e6](https://coolors.co/e7f6e6) or [f8dddd](https://coolors.co/f8dddd) )                                                                                                                                          |
| API_SWAGGER_TITLE          |    N     |                   `IdentityAPI`                    | String used to customise the title of the html page                                                                                                                                                                                                                                            |
| API_SWAGGER_HEADING        |    N     |                 `IdentityService`                  | String used to customise the H2 heading                                                                                                                                                                                                                                                        |
| IDP_CLIENT_ID              |    Y     |                         -                          | OAuth2 client-id to use when validating authentication headers                                                                                                                                                                                                                                 |
| IDP_INTERNAL_CLIENT_ID     |    Y     |                         -                          | Client Id to authenticate internal requests using OIDC                                                                                                                                                                                                                                         |
| IDP_INTERNAL_CLIENT_SECRET |    Y     |                         -                          | Client secret to authenticate internal requests using OIDC                                                                                                                                                                                                                                     |
| IDP_PUBLIC_ORIGIN          |    Y     |                         -                          | Origin of IDP from outside the cluster                                                                                                                                                                                                                                                         |
| IDP_INTERNAL_ORIGIN        |    Y     |                         -                          | Origin of IDP from inside the cluster                                                                                                                                                                                                                                                          |
| IDP_OAUTH2_REALM           |    Y     |                         -                          | Realm to use when authenticating external users                                                                                                                                                                                                                                                |
| IDP_INTERNAL_REALM         |    Y     |                         -                          | Realm to use when authenticating cluster internal users                                                                                                                                                                                                                                        |
| PROXY_FOR                  |    Y     | '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' | This is the ss58 address that transactions will be performed as. (who we are performing the transaction on behalf of) Note that if you want to use this feature in dev - you need to manually set up the proxy on chain before performing transactions, otherwise set this to an empty string. |
| INDEXER_RETRY_DELAY        |    Y     |                       `1000`                       | The delay upon which the indexer re-tries.                                                                                                                                                                                                                                                     |

## Getting started

```sh
# start dependencies
docker compose up -d
# install packages
npm i
# run migrations
npm run db:migrate
# put process flows on-chain
npm run flows
# start service in dev mode. In order to start in full - npm start"
npm run dev
```

(Note: If `PROXY_FOR` env is set -> set up proxy manually in chain.)

If you want to see telemetry (this brings up jaeger and exports logs to it)

```sh
# start dependencies with
docker-compose -f ./docker-compose.yml -f ./docker-compose.telemetry.yml up -d
# install packages
npm i
# run migrations
npm run db:migrate
# put process flows on-chain
npm run flows
# start service in dev mode. In order to start in full - npm start"
npm run dev:telemetry
```

View OpenAPI documentation for all routes with Swagger:

```
localhost:3000/swagger/
```

## Database

> before performing any database interactions like clean/migrate make sure you have database running e.g. docker-compose up -d
> or any local instance if not using docker

```sh
# running migrations
npm run db:migrate

# creating new migration
## install npx globally
npm i -g knex
## make new migration with some prefixes
npx knex migrate:make --knexfile src/lib/db/knexfile.ts migration-name
```

## Tests

Unit tests are executed by calling:

```sh
npm run test:unit
```

Integration tests require the test dependency services be brought up using docker:

```sh
# start dependencies
docker compose -f ./docker-compose-test.yml up -d
# install packages
npm ci
# run migrations
npm run db:migrate
# put process flows on-chain
npm run flows
```

Integration tests are then executed by calling (tests are set up in a way where we are a proxy for Dave by default):

```sh
npm run test:onchain
```

and

```sh
npm run test:offchain
```

All tests above are run with a proxy.
If you want to run onchain tests for proxyless transactions, run:

```sh
npm run test:proxyless
```

## Process Flows

To ensure integrity of data within transactions (and therefore on chain), it's possible to define custom processes that validate transactions. [More info](https://github.com/digicatapult/sqnc-documentation/blob/main/docs/tokenModels/guardRails.md).

Process flows covering this API's transactions are in [`processFlows.json`](./processFlows.json). The file is an array of process flows that can be supplied to the [`sqnc-process-management`](https://github.com/digicatapult/sqnc-process-management) CLI for creating processes on chain:

```
npm run flows
```

## API design

`sqnc-matchmaker-api` provides a RESTful OpenAPI-based interface for third parties and front-ends to interact with the `Sequence` (SQNC) system. The design prioritises:

1. RESTful design principles:
   - all endpoints describing discrete operations on path derived entities.
   - use of HTTP verbs to describe whether state is modified, whether the action is idempotent etc.
   - HTTP response codes indicating the correct status of the request.
   - HTTP response bodies including the details of a query response or details about the entity being created/modified.
2. Simplicity of structure. The API should be easily understood by a third party and traversable.
3. Simplicity of usage:
   - all APIs that take request bodies taking a JSON structured request.
   - all APIs which return a body returning a JSON structured response (again with the exception of attachments.
4. Abstraction of the underlying DLT components. This means no token Ids, no block numbers etc.
5. Conflict free identifiers. All identifiers must be conflict free as updates can come from third party organisations.

### Authentication

The API is authenticated and should be accessed with an OAuth2 JWT Bearer token obtained following the OAuth2 client-credentials flow against the deployment's identity-provider.

### Fundamental entities

These are the top level physical concepts in the system. They are the top level RESTful path segments. Note that different states of an entity will **NOT** be represented as different top level entities.

- `v1/demandA`
- `v1/demandB`
- `v1/match2`

Note the meaning in the API of `demandA` and `demandB` are abstract and use-case dependent. For example in the case of a logistics matching service where one provider has an `order` to be moved and another has some `capacity` to move orders one might represent an `order` as a `demandA` and a `capacity` as a `demandB`. Interpretation of these labels is entirely by convention.

### Entity queries

Entity queries allow the API user to list those entities (including a query) and to get a specific entity. For `demandA` for example:

- `GET /v1/demandA` - get all demandAs
- `GET /v1/demandA/{demandAId}` - get a demandA by ID

### Entity creation

Allows the creation of an initial local state for an entity. Note this is essentially just to establish an internal identifier for the entity and **the state is not shared across the blockchain network at this point**.

- `POST /v1/demandB`

### Entity updates

Allows different kind of updates to be prepared and applied to an entity. For example, a `demandB` or `match2` must be submitted via a `creation` action.

- `POST /v1/demandB/{demandBId}/creation` - create a creation `creation` transaction and send it to the blockchain.
- `GET /v1/demandB/{demandBId}/creation` - list a demandB's `creation` transactions and their status.
- `GET /v1/demandB/{demandBId}/creation/{creationId}` - get the details of a demandB `creation` transaction.

- `POST/v1/match2/{match2Id}/cancellation` - submits cancellation request and creates a transaction
- `GET /v1/match2/{match2Id}/cancellation` - retrieves all cancellation transactions for specific `match2Id`
- `GET /v1/match2/{match2Id}/cancellation/{cancellationId}` - retrieves a specific cancellation transaction

## Demo scenario

### Services

Run `docker compose -f docker-compose-3-persona.yml up -d` to start the required dependencies to fully demo `sqnc-matchmaker-api`.

The demo involves three personas: `MemberA`, `MemberB` and an `Optimiser`. Each persona has a set of `sqnc` services:

- sqnc-matchmaker-api (+ PostgreSQL)
- sqnc-identity-service (+ PostgreSQL)
- sqnc-node

There is also a single `ipfs` node for file storage and `keycloak` instance used as the identity provider with a realm (`member-a`, `member-b`, `optimiser`) configured for each persona.

Container names are prefixed with the persona e.g. `member-a-node`. Services are networked so that only the `sqnc-node` instances communicate cross-persona. Each persona uses a `substrate` well-known identity for their `sqnc-node`:

```
"MemberA": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", // alice
"MemberB": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", // bob
"Optimiser": "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y", // charlie
```

The `docker compose` automatically adds process flows using `MemberA`. Process flows validate transactions that affect the chain.

### Authentication

To generate an authentication token for a given persona we will need to perform the client credentials flow against the correct `keycloak` realm. If using the `swagger` interface for each API this can be done by clicking `Authorize` and passing the `client_id` `sequence` and the `client_secret` `secret`. All other API calls through the swagger will now pass with the correct authorization header. If you would prefer to interact with the API from the command line you can generate an authentication token, for example with MemberA, with:

```
curl -X POST \
  'http://localhost:3080/realms/member-a/protocol/openid-connect/token' \
  -H 'content-type: application/x-www-form-urlencoded' \
  -d grant_type=client_credentials \
  -d client_id=sequence \
  -d client_secret=secret
```

This will return a JSON response with the property `access_token` containing the JWT access token which will look something like `eyJhbGci...iPeDl3Fg`. API calls can then be conducted by passing this as a bearer token in an `authorization` header. For curl this is done with an argument like `-H 'authorization: bearer eyJhbGci...iPeDl3Fg'`.

### Identities

Before transacting, aliases (a human-friendly names) can be set for the pre-configured node addresses using each persona's `sqnc-identity-service`. The value for alias doesn't matter, it just needs some value e.g. `self`. For example, to set the self address for `MemberA`, you can either use the [identity service swagger](http://localhost:3002/swagger/#/members/put_members__address_) or run (remembering to put in a valid authorisation token):

```
curl -X 'PUT' \
  'http://localhost:3002/v1/members/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'authorization: bearer eyJhbGci...iPeDl3Fg' \
  -d '{
  "alias": "self"
}'
```

Each persona's identity service:

- [MemberA](http://localhost:3002/swagger/)
- [MemberB](http://localhost:3012/swagger/)
- [Optimiser](http://localhost:3022/swagger/)

By default, if no alias is set, the alias is the same as the node address.

### Attachments

Some entities reference an attachment that must be uploaded to the attachment API and then referenced by id. These may be a generic multi-part form file or a JSON blob. For example to upload a JSON file to the attachment API of `MemberA`:

```
curl -X 'POST' \
  'http://localhost:3003/v1/attachment' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'authorization: bearer eyJhbGci...iPeDl3Fg' \
  -d '{
  "example": "data"
}'
```

Each persona's attachment service:

- [MemberA](http://localhost:3003/swagger/)
- [MemberB](http://localhost:3013/swagger/)
- [Optimiser](http://localhost:3023/swagger/)

### Using the matchmaker API

The environment is now ready to run through a demo scenario using each persona's matchmaker APIs:

- [MemberA](http://localhost:3000/swagger/)
- [MemberB](http://localhost:3010/swagger/)
- [Optimiser](http://localhost:3020/swagger/)

Note the meaning in the API of `demandA` and `demandB` are abstract and use-case dependent. For example in the case of a logistics matching service where one provider has an `order` to be moved and another has some `capacity` to move orders one might represent an `order` as a `demandA` and a `capacity` as a `demandB`.

1. `MemberA` wants to create a `demandA`, which includes a parameters file that details the parameters of the available demandA they have. The parameters file will be used by `Optimiser` when matching `demandA` with a `demandB`. First `MemberA` must upload this parameters file to their local [attachment-api](#attachments).
2. They use the returned `id` for `parametersAttachmentId` in the request body to [`POST /v1/demandA`](http://localhost:3000/swagger/#/demandA/Create). At this point, the `demandA` only exists in the `MemberA` database.
3. When `MemberA` is ready for the `demandA` to exist on chain they [`POST /v1/demandA/{demandAId}/creation`](http://localhost:3000/swagger/#/demandA/CreateDemandAOnChain).
4. Putting something on chain creates a local `transaction` database entry which records the status of block finalisation. Every route that puts something on chain returns a transaction `id`. These routes also have an accompanying `GET` route that returns all of the transactions of that transaction type e.g. [`GET /v1/demandA/{demandAId}/creation`](http://localhost:3000/swagger/#/demandA/GetAllTransactions) returns the details of all `demandA` creation transactions. The transaction `id` can be supplied to [`GET /v1/demandA/{demandAId}/creation/{creationId}`](http://localhost:3000/swagger/#/demandA/GetDemandACreation) to get that specific transaction. Alternatively [`GET /v1/transaction`](http://localhost:3000/swagger/#/transaction/GetAllTransactions) can be used to get all transactions of any type.
5. Once the block has finalised, The indexers running on `MemberB` and `Optimiser`'s `sqnc-matchmaker-api` will process the block containing the new `demandA` and update their local databases (assuming their `sqnc-node` instance is running and connected). They will be able to see the new `demandA` with [`GET /v1/demandA`](http://localhost:3010/swagger/#/demandA/GetAll).
6. `MemberB` creates a [`demandB`](http://localhost:3010/swagger/#/demandB/CreateDemandB)) in a similar manner to creating a `demandA`. It includes a parameters file to describe the parameters of their `demandB`.
7. When `MemberB` is ready for the `demandB` to exist on chain they [`POST /v1/demandB/{id}/creation`](http://localhost:3010/swagger/#/demandB/CreateDemandBOnChain).
8. `Optimiser` can now create a [`match2`](http://localhost:3020/swagger/#/match2/ProposeMatch2) that matches a single `demandA` with a single `demandB`. They supply their local `id` for `demandA` and `demandB`.
9. When `Optimiser` is ready for the `match2` to exist on chain they [`POST /v1/match2/{id}/proposal`](http://localhost:3020/swagger/#/match2/ProposeMatch2OnChain).
10. Either `MemberA` or `MemberB` can accept the `match2` with [`POST /v1/match2/{id}/accept`](http://localhost:3000/swagger/#/match2/AcceptMatch2OnChain). It doesn't matter which member accepts first.
11. Once the second member accepts, we have a successful match! The `match2` state changes to `acceptedFinal` and `demandA` + `demandB` state moves to `allocated`. These demands can no longer be used in a new `match2`.

To clear chain and database state, delete the volumes e.g. `docker compose -f docker-compose-3-persona.yml down -v`.

### Rejection paths

The previous scenario covers a 'happy path' where every member accepts each step without issue. There are also routes for communicating when something has gone wrong.

#### Commenting on demands

At any time a `demandA` or `demandB` can be commented on by any member by `POST`ing a single attachment to [`POST /v1/demandA/{id}/comment`](http://localhost:3000/swagger/#/demandA/CreateDemandBCommentOnChain) or [`POST /v1/demandB/{id}/comment`](http://localhost:3000/swagger/#/demandB/CreateDemandBCommentOnChain). The attachment is a file that informs the owner of the demand about anything (e.g. an issue, correction) related to the demand. A demand can be commented on multiple times and it does not change the demand's state.

#### Rejecting match2

At any time after a `match2` is `proposed`, and before it reaches `acceptedFinal` state, any of its members can reject the `match2` using [`POST /v1/match2/{id}/rejection`](http://localhost:3000/swagger/#/match2/RejectMatch2OnChain). Once a `match2` is rejected, it is permanently closed.

#### Cancelling match2

At any time after a `match2` is in `acceptedFinal` state either `memberA` or `memberB` can cancel the `match2` using [`POST /v1/match2/{id}/cancellation`](http://localhost:3000/swagger/#/match2/CancelMatch2OnChain). Once a `match2` is cancelled, it is permanently closed. However, optimiser won't be able to cancel a `match2`
