# dscp-matchmaker-api

## Description

A `Node.js` typescript template with open api implementation

## Configuration

Use a `.env` at root of the repository to set values for the environment variables defined in `.env` file.

| variable              | required |        default         | description                                                                          |
| :-------------------- | :------: | :--------------------: | :----------------------------------------------------------------------------------- |
| PORT                  |    N     |         `3000`         | The port for the API to listen on                                                    |
| LOG_LEVEL             |    N     |        `debug`         | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |
| ENVIRONMENT_VAR       |    N     |       `example`        | An environment specific variable                                                     |
| DB_PORT               |    N     |         `5432`         | The port for the database                                                            |
| DB_HOST               |    Y     |           -            | The database hostname / host                                                         |
| DB_NAME               |    N     | `dscp-matchmaker-api ` | The database name                                                                    |
| DB_USERNAME           |    Y     |           -            | The database username                                                                |
| DB_PASSWORD           |    Y     |           -            | The database password                                                                |
| IDENTITY_SERVICE_HOST |    Y     |           -            | Hostname of the `dscp-identity-service`                                              |
| IDENTITY_SERVICE_PORT |    Y     |           -            | Port of the `dscp-identity-service`                                                  |
| DSCP_API_HOST         |    Y     |           -            | Hostname of the `dscp-api`                                                           |
| DSCP_API_PORT         |    Y     |           -            | Port of the `dscp-api`                                                               |

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

- `capacity`
- `order`
- `match2`

Additionally, there is the `attachment` entity which returns an `id` that can then be used when preparing entity updates to attach files.

### Entity queries

Entity queries allow the API user to list those entities (including a query) and to get a specific entity. For `order` for example:

- `GET /capacity` - get all capacities
- `GET /capacity/{capacityId}` - get a capacity by ID

### Entity creation

Allows the creation of an initial local state for an entity. Note this is essentially just to establish an internal identifier for the entity and **the state is not shared across the blockchain network at this point**.

- `POST /capacity`

### Entity updates

Allows different kind of updates to be prepared and applied to an entity. For example, a `capacity` must be submitted via a `creation` action.

- `POST /capacity/{capacityId}/creation` - create a creation `creation` transaction and send it to the blockchain.
- `GET /capacity/{capacityId}/creation` - list a capacity's `creation` transactions and their status.
- `GET /capacity/{capacityId}/creation/{creationId}` - get the details of a capacity `creation` transaction.

### Attachment API

The last top level entity `attachment`, which accepts a `multipart/form-data` payload for uploading a file or `application/json` for uploading JSON as a file. This will return an `id` that can then be used when preparing entity updates to attach files.

- `POST /attachment` - upload a file.
- `GET /attachment` - list all attachments.
- `GET /attachment/{attachmentId}` - download an attachment.

## Demo scenario

Run `docker compose up -d` to start the required dependencies to demo `dscp-matchmaker-api`.

The demo involves three personas: `MemberA`, `MemberB` and an `Optimiser`. For the purposes of the demo, a single set of `dscp` services will be used and all three personas will use the same development node address. In the real world each persona would be running their own set of `dscp` services and each use a unique node address.

Before transacting, an alias (a human-friendly name) must be set for the pre-configured dev node address `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` using the `dscp-identity-service`. The value for alias doesn't matter, it just needs some value e.g. `self`. Either use the [identity service swagger](http://localhost:3002/v1/swagger/#/members/put_members__address_) or run:

```
curl -X 'PUT' \
  'http://localhost:3002/v1/members/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "alias": "self"
}'
```

1. `MemberA` wants to create a `capacity`, which includes a parameters file to the parameters of the available capacity they have. The parameters file will be used by `Optimiser` when matching `capacity` with a `demand`. First `MemberA` must upload this parameters file to their local database with `POST /attachment`.
2. They use the returned `id` for the `parametersAttachmentId` in the request body to `POST /capacity`. At this point, the `capacity` only exists in the `MemberA` database.
3. When `MemberA` is ready for the `capacity` to exist on chain they `POST capacity/{capacityId}/creation`. `MemberB` and `Optimiser` can now see the `capacity` if their node is running and connected.
4. `MemberB` creates an `order`, which includes a parameters file to describe the parameters of their order.
5. When `MemberB` is ready for the `order` to exist on chain they `POST order/{id}/creation`.
6. `Optimiser` can now create a `match2` that matches a single `capacity` with a single `order`. They supply these as an `id` for `demandA` and `demandB`. It doesn't matter if which is `demandA` and which is `demandB`.
7. When `Optimiser` is ready for the `match2` to exist on chain they `POST match2/{id}/propose`.

//TODO the accept steps
