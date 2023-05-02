# Database usage

## Database migrations

Database migrations are handled using [`knex.js`](https://knexjs.org/) and can be migrated manually using the following commands:

```sh
npm run db:migrate # used to migrate to latest database version
npx knex migrate:up --knexfile src/lib/db/knexfile.ts  # used to migrate to the next database version
npx knex migrate:down --knexfile src/lib/db/knexfile.ts  # used to migrate to the previous database version
```

## Table structure

The following tables exist in the `matchmaker-api` database.

### `attachment`

| column       | PostgreSQL type           | nullable |       default        | description                            |
| :----------- | :------------------------ | :------- | :------------------: | :------------------------------------- |
| `id`         | `UUID`                    | FALSE    | `uuid_generate_v4()` | Unique identifier for the `attachment` |
| `filename`   | `CHARACTER VARYING (255)` | TRUE     |          -           | Attachment filename                    |
| `ipfs_hash`  | `CHARACTER VARYING (255)` | FALSE    |          -           | Attachment CID in IPFS                 |
| `size`       | `BIG INT`                 | TRUE     |          -           | Size of file in bytes if known         |
| `created_at` | `dateTime`                | FALSE    |       `now()`        | When the row was first created         |

#### Indexes

| columns | Index Type | description |
| :------ | :--------- | :---------- |
| `id`    | PRIMARY    | Primary key |

### `demand`

| column                     | PostgreSQL type | nullable |       default        | description                               |
| :------------------------- | :-------------- | :------- | :------------------: | :---------------------------------------- |
| `id`                       | `UUID`          | FALSE    | `uuid_generate_v4()` | Unique identifier for the `attachment`    |
| `owner`                    | `STRING (48)`   | FALSE    |          -           | Demand owner name                         |
| `subtype`                  | `ENUM`          | FALSE    |          -           | The demand subtype (`order`, `capacity`)  |
| `state`                    | `ENUM`          | FALSE    |          -           | The demand state (`created`, `allocated`) |
| `parameters_attachment_id` | `UUID`          | FALSE    |          -           | The ID of the associated attachment       |
| `latest_token_id`          | `INT`           | TRUE     |          -           | Possible current token ID                 |
| `original_token_id`        | `INT`           | TRUE     |          -           | Possible original token ID                |
| `created_at`               | `dateTime`      | FALSE    |       `now()`        | When the row was first created            |
| `updated_at`               | `dateTime`      | FALSE    |       `now()`        | When the row was last updated             |

#### Indexes

| columns | Index Type | description |
| :------ | :--------- | :---------- |
| `id`    | PRIMARY    | Primary key |

#### Foreign Keys

| columns                    | References     | description                  |
| :------------------------- | :------------- | :--------------------------- |
| `parameters_attachment_id` | attachment(id) | The id of the attachment row |

### `transaction`

| column             | PostgreSQL type | nullable |       default        | description                                               |
| :----------------- | :-------------- | :------- | :------------------: | :-------------------------------------------------------- |
| `id`               | `UUID`          | FALSE    | `uuid_generate_v4()` | Unique identifier for the `transaction`                   |
| `local_id`         | `UUID`          | FALSE    |                      | The Match2 or Demand id of the transaction                |
| `api_type`         | `ENUM`          | FALSE    |                      | The entity of transaction (`match2`, `order`, `capacity`) |
| `transaction_type` | `ENUM`          | FALSE    |                      | The transaction type (creation, proposal, accept)         |
| `hash`             | `CHAR (64)`     | FALSE    |                      | The `hash` of the transaction extrinsic                   |

#### Indexes

| columns | Index Type | description |
| :------ | :--------- | :---------- |
| `id`    | PRIMARY    | Primary key |

### `Match2`

#### Columns

| column              | PostgreSQL type           | nullable |       default        | description                                                                 |
| :------------------ | :------------------------ | :------- | :------------------: | :-------------------------------------------------------------------------- |
| `id`                | `UUID`                    | FALSE    | `uuid_generate_v4()` | Unique identifier for the `match2`                                          |
| `optimiser`         | `STRING (48)`             | FALSE    |          -           | Name of the optimiser                                                       |
| `member_a`          | `STRING (48)`             | FALSE    |          -           | Name of the first member                                                    |
| `member_b`          | `STRING (48)`             | FALSE    |          -           | Name of the second member                                                   |
| `state`             | `ENUM`                    | FALSE    |          -           | Current match state (`proposed`, `acceptedA`, `acceptedB`, `acceptedFinal`) |
| `latest_token_id`   | `INT`                     | TRUE     |          -           | Possible current token ID                                                   |
| `original_token_id` | `INT`                     | TRUE     |          -           | Possible original token ID                                                  |
| `demand_a_id`       | `UUID`                    | FALSE    |          -           | Unique identifier for the first demand                                      |
| `demand_b_id`       | `UUID`                    | FALSE    |          -           | Unique identifier for the second demand                                     |
| `created_at`        | `Timestamp with timezone` | FALSE    |       `now()`        | When the row was first created                                              |
| `updated_at`        | `Timestamp with timezone` | FALSE    |       `now()`        | When the row was updated                                                    |

#### Indexes

| columns | Index Type | description |
| :------ | :--------- | :---------- |
| `id`    | PRIMARY    | Primary key |

#### Foreign Keys

| columns       | References | description              |
| :------------ | :--------- | :----------------------- |
| `demand_a_id` | demand(id) | The id of the demand row |
| `demand_b_id` | demand(id) | The id of the demand row |

### `processed_blocks`

| column       | PostgreSQL type           | nullable | default | description                        |
| :----------- | :------------------------ | :------- | :-----: | :--------------------------------- |
| `hash`       | `CHAR (64)`               | FALSE    |         | The `hash` for the processed block |
| `height`     | `BIGINT`                  | FALSE    |         | The size of the processed block    |
| `parent`     | `CHAR (64)`               | FALSE    |         | The parent of the processed block  |
| `created_at` | `Timestamp with timezone` | FALSE    | `now()` | When the row was first created     |

#### Indexes

| columns | Index Type | description |
| :------ | :--------- | :---------- |
| `hash`  | PRIMARY    | Primary key |

#### Foreign Keys

| columns  | References          | description                         |
| :------- | :------------------ | :---------------------------------- |
| `parent` | processed_block(id) | The hash of the processed block row |
