# dscp-matchmaker-api

## Description

A `Node.js` typescript template with open api implementation

## Configuration

Use a `.env` at root of the repository to set values for the environment variables defined in `.env` file.

| variable              | required |        default         | description                                                                                  |
| :-------------------- | :------: | :--------------------: | :------------------------------------------------------------------------------------------- |
| PORT                  |    N     |         `3000`         | The port for the API to listen on                                                            |
| LOG_LEVEL             |    N     |        `debug`         | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`]         |
| ENVIRONMENT_VAR       |    N     |       `example`        | An environment specific variable                                                             |
| DB_PORT               |    N     |         `5432`         | The port for the database                                                                    |
| DB_HOST               |    Y     |           -            | The database hostname / host                                                                 |
| DB_NAME               |    N     | `dscp-matchmaker-api ` | The database name                                                                            |
| DB_USERNAME           |    Y     |           -            | The database username                                                                        |
| DB_PASSWORD           |    Y     |           -            | The database password                                                                        |
| IDENTITY_SERVICE_HOST |    Y     |           -            | Hostname of the `dscp-identity-service`                                                      |
| IDENTITY_SERVICE_PORT |    N     |         `3000`         | Port of the `dscp-identity-service`                                                          |
| NODE_HOST             |    Y     |           -            | The hostname of the `dscp-node` the API should connect to                                    |
| NODE_PORT             |    N     |         `9944`         | The port of the `dscp-node` the API should connect to                                        |
| LOG_LEVEL             |    N     |         `info`         | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`]         |
| USER_URI              |    Y     |           -            | The Substrate `URI` representing the private key to use when making `dscp-node` transactions |
| IPFS_HOST             |    Y     |           -            | Hostname of the `IPFS` node to use for metadata storage                                      |
| IPFS_PORT             |    N     |         `5001`         | Port of the `IPFS` node to use for metadata storage                                          |

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
npx knex migrate:make --knexfile src/lib/db/knexfile.ts attachment-table
```

## Tests

Integration tests are executed by calling:

```sh
npm run test
```

Unit tests are executed by calling:

```sh
npm run test:unit
```

## Process Flows

To ensure integrity of data within transactions (and therefore on chain), it's possible to define custom processes that validate transactions. [More info](https://github.com/digicatapult/dscp-documentation/blob/main/docs/tokenModels/guardRails.md).

Process flows covering this API's transactions are in [`processFlows.json`](./processFlows.json). The file is an array of process flows that can be supplied to the [`dscp-process-management`](https://github.com/digicatapult/dscp-process-management) CLI for creating processes on chain:

```
npm run flows
```

## API design

`dscp-matchmaker-api` provides a RESTful OpenAPI-based interface for third parties and front-ends to interact with the `DSCP` system. The design prioritises:

1. RESTful design principles:
   - all endpoints describing discrete operations on path derived entities.
   - use of HTTP verbs to describe whether state is modified, whether the action is idempotent etc.
   - HTTP response codes indicating the correct status of the request.
   - HTTP response bodies including the details of a query response or details about the entity being created/modified.
2. Simplicity of structure. The API should be easily understood by a third party and traversable.
3. Simplicity of usage:
   - all APIs that take request bodies taking a JSON structured request with the exception of attachment upload (which is idiomatically represented as a multipart form).
   - all APIs which return a body returning a JSON structured response (again with the exception of attachments.
4. Abstraction of the underlying DLT components. This means no token Ids, no block numbers etc.
5. Conflict free identifiers. All identifiers must be conflict free as updates can come from third party organisations.

### Fundamental entities

These are the top level physical concepts in the system. They are the top level RESTful path segments. Note that different states of an entity will **NOT** be represented as different top level entities.

- `v1/capacity`
- `v1/order`
- `v1/match2`

Additionally, there is the `attachment` entity which returns an `id` to be used when preparing entity updates to attach files.

### Entity queries

Entity queries allow the API user to list those entities (including a query) and to get a specific entity. For `order` for example:

- `GET /v1/capacity` - get all capacities
- `GET /v1/capacity/{capacityId}` - get a capacity by ID

### Entity creation

Allows the creation of an initial local state for an entity. Note this is essentially just to establish an internal identifier for the entity and **the state is not shared across the blockchain network at this point**.

- `POST /v1/capacity`

### Entity updates

Allows different kind of updates to be prepared and applied to an entity. For example, a `capacity` must be submitted via a `creation` action.

- `POST /v1/capacity/{capacityId}/creation` - create a creation `creation` transaction and send it to the blockchain.
- `GET /v1/capacity/{capacityId}/creation` - list a capacity's `creation` transactions and their status.
- `GET /v1/capacity/{capacityId}/creation/{creationId}` - get the details of a capacity `creation` transaction.

### Attachment API

The last top level entity `attachment`, which accepts a `multipart/form-data` payload for uploading a file or `application/json` for uploading JSON as a file. This will return an `id` that can then be used when preparing entity updates to attach files.

- `POST /v1/attachment` - upload a file.
- `GET /v1/attachment` - list all attachments.
- `GET /v1/attachment/{attachmentId}` - download an attachment.

## Demo scenario

Run `docker compose -f docker-compose-3-persona.yml up -d` to start the required dependencies to fully demo `dscp-matchmaker-api`.

The demo involves three personas: `MemberA`, `MemberB` and an `Optimiser`. Each persona has a set of `dscp` services:

- dscp-matchmaker-api (+ PostgreSQL)
- dscp-node
- dscp-ipfs
- dscp-identity-service (+ PostgreSQL)

The container names are prefixed with the persona e.g. `member-a-ipfs`. Services are networked so that only the `dscp-node` and `dscp-ipfs` instances communicate cross-persona. Each persona uses a `substrate` well-known identity for their `dscp-node`:

```
"MemberA": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", // alice
"MemberB": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", // bob
"Optimiser": "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y", // charlie
```

Before transacting, aliases (a human-friendly names) can be set using each persona's `dscp-identity-service` for the pre-configured node addresses. The value for alias doesn't matter, it just needs some value e.g. `self`. For example, to set the self address for `MemberA`, you can either use the [identity service swagger](http://localhost:3011/v1/swagger/#/members/put_members__address_) or run:

```
curl -X 'PUT' \
  'http://localhost:3011/v1/members/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "alias": "self"
}'
```

The docker compose automatically adds process flows. Process flows validate transactions that affect the chain.

API steps

1. `MemberA` wants to create a `capacity`, which includes a parameters file to the parameters of the available capacity they have. The parameters file will be used by `Optimiser` when matching `capacity` with a `order`. First `MemberA` must upload this parameters file to their local database with `POST /attachment`.
2. They use the returned `id` for `parametersAttachmentId` in the request body to `POST /capacity`. At this point, the `capacity` only exists in the `MemberA` database.
3. When `MemberA` is ready for the `capacity` to exist on chain they `POST capacity/{capacityId}/creation`. `MemberB` and `Optimiser` can now see the `capacity` if their node is running and connected.
4. `MemberB` creates an `order` in a similar manner to creating a `capacity`. It includes a parameters file to describe the parameters of their order.
5. When `MemberB` is ready for the `order` to exist on chain they `POST order/{id}/creation`.
6. `Optimiser` can now create a `match2` that matches a single `capacity` with a single `order`. They supply these as an `id` for `demandA` and `demandB`. It doesn't matter which is `demandA` and which is `demandB`.
7. When `Optimiser` is ready for the `match2` to exist on chain they `POST match2/{id}/propose`.
