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

### `demand`

| column                     | PostgreSQL type | nullable |       default        | description                                          |
| :------------------------- | :-------------- | :------- | :------------------: | :--------------------------------------------------- |
| `id`                       | `UUID`          | FALSE    | `uuid_generate_v4()` | Unique identifier for the `demand`                   |
| `owner`                    | `STRING (48)`   | FALSE    |          -           | Demand owner name                                    |
| `subtype`                  | `ENUM`          | FALSE    |          -           | The demand subtype (`demand_a`, `demand_b`)          |
| `state`                    | `ENUM`          | FALSE    |          -           | The demand state (`pending`, `created`, `allocated`) |
| `parameters_attachment_id` | `UUID`          | FALSE    |          -           | The ID of the associated attachment                  |
| `latest_token_id`          | `INT`           | TRUE     |          -           | Possible current token ID                            |
| `original_token_id`        | `INT`           | TRUE     |          -           | Possible original token ID                           |
| `created_at`               | `dateTime`      | FALSE    |       `now()`        | When the row was first created                       |
| `updated_at`               | `dateTime`      | FALSE    |       `now()`        | When the row was last updated                        |

#### Indexes

| columns | Index Type | description |
| :------ | :--------- | :---------- |
| `id`    | PRIMARY    | Primary key |

### `transaction`

| column             | PostgreSQL type | nullable |       default        | description                                                                     |
| :----------------- | :-------------- | :------- | :------------------: | :------------------------------------------------------------------------------ |
| `id`               | `UUID`          | FALSE    | `uuid_generate_v4()` | Unique identifier for the `transaction`                                         |
| `local_id`         | `UUID`          | FALSE    |                      | The Match2 or Demand id of the transaction                                      |
| `api_type`         | `ENUM`          | FALSE    |                      | The entity of transaction (`match2`, `demand_a`, `demand_b`)                    |
| `transaction_type` | `ENUM`          | FALSE    |                      | The transaction type (`creation`, `proposal`, `accept`, `comment`, `rejection`) |
| `hash`             | `CHAR (64)`     | FALSE    |                      | The `hash` of the transaction extrinsic                                         |

#### Indexes

| columns          | Index Type | description                                            |
| :--------------- | :--------- | :----------------------------------------------------- |
| `id`             | PRIMARY    | Primary key                                            |
| `id`, `local_id` | UNIQUE     | Unique to to support foreign key from `demand_comment` |

### `Match2`

#### Columns

| column              | PostgreSQL type           | nullable |       default        | description                                                                                        |
| :------------------ | :------------------------ | :------- | :------------------: | :------------------------------------------------------------------------------------------------- |
| `id`                | `UUID`                    | FALSE    | `uuid_generate_v4()` | Unique identifier for the `match2`                                                                 |
| `optimiser`         | `STRING (48)`             | FALSE    |          -           | Name of the optimiser                                                                              |
| `member_a`          | `STRING (48)`             | FALSE    |          -           | Name of the first member                                                                           |
| `member_b`          | `STRING (48)`             | FALSE    |          -           | Name of the second member                                                                          |
| `state`             | `ENUM`                    | FALSE    |          -           | Current match state (`pending`, `proposed`, `acceptedA`, `acceptedB`, `acceptedFinal`, `rejected`) |
| `latest_token_id`   | `INT`                     | TRUE     |          -           | Possible current token ID                                                                          |
| `original_token_id` | `INT`                     | TRUE     |          -           | Possible original token ID                                                                         |
| `demand_a_id`       | `UUID`                    | FALSE    |          -           | Unique identifier for the first demand                                                             |
| `demand_b_id`       | `UUID`                    | FALSE    |          -           | Unique identifier for the second demand                                                            |
| `created_at`        | `Timestamp with timezone` | FALSE    |       `now()`        | When the row was first created                                                                     |
| `updated_at`        | `Timestamp with timezone` | FALSE    |       `now()`        | When the row was updated                                                                           |

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

### `demand_comment`

| column           | PostgreSQL type           | nullable | default | description                                        |
| :--------------- | :------------------------ | :------- | :-----: | :------------------------------------------------- |
| `id`             | `UUID`                    | FALSE    |         | Transaction id when the comment was created        |
| `owner`          | `CHAR (64)`               | FALSE    |         | Address of the commenter                           |
| `state`          | `ENUM`                    | FALSE    |         | `pending` or `created`                             |
| `demand`         | `UUID`                    | FALSE    |         | Id of the demand this comment is on                |
| `attachment_id`  | `UUID`                    | FALSE    |         | Id of the attachment with the comment content      |
| `transaction_id` | `UUID`                    | FALSE    |         | Id of the transaction the comment was performed in |
| `created_at`     | `Timestamp with timezone` | FALSE    | `now()` | Creation datetime                                  |
| `updated_at`     | `Timestamp with timezone` | FALSE    | `now()` | Last updated datetime                              |

#### Indexes

| columns | Index Type | description |
| :------ | :--------- | :---------- |
| `id`    | PRIMARY    | Primary key |

#### Foreign Keys

| columns                    | References                | description                                                                 |
| :------------------------- | :------------------------ | :-------------------------------------------------------------------------- |
| `transaction_id`, `demand` | transaction(id, local_id) | Ensures the comment is associated with a transaction for the correct demand |
| `demand`                   | demand(id)                | Ensures the demand is a valid demand                                        |

### `match2_comment`

| column           | PostgreSQL type           | nullable | default | description                                        |
| :--------------- | :------------------------ | :------- | :-----: | :------------------------------------------------- |
| `id`             | `UUID`                    | FALSE    |         | Transaction id when the comment was created        |
| `owner`          | `CHAR (64)`               | FALSE    |         | Address of the commenter                           |
| `state`          | `ENUM`                    | FALSE    |         | `pending` or `created`                             |
| `match2`         | `UUID`                    | FALSE    |         | Id of the match2 this comment is on                |
| `attachment_id`  | `UUID`                    | FALSE    |         | Id of the attachment with the comment content      |
| `transaction_id` | `UUID`                    | FALSE    |         | Id of the transaction the comment was performed in |
| `created_at`     | `Timestamp with timezone` | FALSE    | `now()` | Creation datetime                                  |
| `updated_at`     | `Timestamp with timezone` | FALSE    | `now()` | Last updated datetime                              |

#### Indexes

| columns | Index Type | description |
| :------ | :--------- | :---------- |
| `id`    | PRIMARY    | Primary key |

#### Foreign Keys

| columns                    | References                | description                                                                 |
| :------------------------- | :------------------------ | :-------------------------------------------------------------------------- |
| `transaction_id`, `match2` | transaction(id, local_id) | Ensures the comment is associated with a transaction for the correct match2 |
| `match2`                   | match2(id)                | Ensures the demand is a valid demand                                        |
