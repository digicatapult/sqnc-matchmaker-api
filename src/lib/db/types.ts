import { Knex } from 'knex'
import { z } from 'zod'

const char64Parser = z.string().max(64)

export const tablesList = [
  'demand',
  'transaction',
  'match2',
  'processed_blocks',
  'unprocessed_blocks',
  'demand_comment',
  'match2_comment',
] as const

export const demandStateParser = z.union([
  z.literal('pending'),
  z.literal('created'),
  z.literal('allocated'),
  z.literal('cancelled'),
])
export const demandSubtypeParser = z.union([z.literal('demand_a'), z.literal('demand_b')])
const insertDemand = z.object({
  owner: z.string(),
  state: demandStateParser,
  subtype: demandSubtypeParser,
  parameters_attachment_id: z.string(),
  latest_token_id: z.union([z.number(), z.null()]),
  original_token_id: z.union([z.number(), z.null()]),
})

export const transactionApiTypeParser = z.union([z.literal('match2'), z.literal('demand_a'), z.literal('demand_b')])
export const transactionStateParser = z.union([
  z.literal('submitted'),
  z.literal('inBlock'),
  z.literal('finalised'),
  z.literal('failed'),
])
const insertTransaction = z.object({
  local_id: z.string(),
  api_type: transactionApiTypeParser,
  state: transactionStateParser,
  transaction_type: z.union([
    z.literal('creation'),
    z.literal('proposal'),
    z.literal('accept'),
    z.literal('comment'),
    z.literal('rejection'),
    z.literal('cancellation'),
  ]),
  hash: char64Parser,
})

export const match2StateParser = z.union([
  z.literal('pending'),
  z.literal('proposed'),
  z.literal('acceptedA'),
  z.literal('acceptedB'),
  z.literal('acceptedFinal'),
  z.literal('rejected'),
  z.literal('cancelled'),
])
const insertMatch2 = z.object({
  optimiser: z.string().max(48),
  member_a: z.string().max(48),
  member_b: z.string().max(48),
  state: match2StateParser,
  latest_token_id: z.union([z.number(), z.null()]),
  original_token_id: z.union([z.number(), z.null()]),
  demand_a_id: z.string(),
  demand_b_id: z.string(),
  replaces_id: z.union([z.string(), z.null()]),
})

const insertBlock = z.object({
  hash: char64Parser,
  height: z.union([z.string(), z.number()]).transform((h) => BigInt(h)),
  parent: char64Parser,
})

const insertDemandComment = z.object({
  owner: char64Parser,
  state: z.union([z.literal('pending'), z.literal('created')]),
  demand: z.string(),
  attachment_id: z.string(),
  transaction_id: z.union([z.string(), z.null()]),
})

const insertMatch2Comment = z.object({
  owner: char64Parser,
  state: z.union([z.literal('pending'), z.literal('created')]),
  match2: z.string(),
  attachment_id: z.string(),
  transaction_id: z.union([z.string(), z.null()]),
})

const defaultFields = z.object({
  id: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
})

const Zod = {
  demand: {
    insert: insertDemand,
    get: insertDemand.merge(defaultFields),
  },
  transaction: {
    insert: insertTransaction,
    get: insertTransaction.merge(defaultFields),
  },
  match2: {
    insert: insertMatch2,
    get: insertMatch2.merge(defaultFields),
  },
  processed_blocks: {
    insert: insertBlock,
    get: insertBlock.merge(z.object({ created_at: z.date() })),
  },
  unprocessed_blocks: {
    insert: insertBlock,
    get: insertBlock.merge(z.object({ created_at: z.date() })),
  },
  demand_comment: {
    insert: insertDemandComment,
    get: insertDemandComment.merge(defaultFields),
  },
  match2_comment: {
    insert: insertMatch2Comment,
    get: insertMatch2Comment.merge(defaultFields),
  },
}

export type InsertDemand = z.infer<typeof Zod.demand.insert>
export type DemandRow = z.infer<typeof Zod.demand.get>
export type InsertTransaction = z.infer<typeof Zod.transaction.insert>
export type TransactionRow = z.infer<typeof Zod.transaction.get>
export type InsertMatch2 = z.infer<typeof Zod.match2.insert>
export type Match2Row = z.infer<typeof Zod.match2.get>
export type InsertProcessedBlock = z.infer<typeof Zod.processed_blocks.insert>
export type ProcessedBlockRow = z.infer<typeof Zod.processed_blocks.get>
export type InsertUnprocessedBlock = z.infer<typeof Zod.unprocessed_blocks.insert>
export type UnprocessedBlockRow = z.infer<typeof Zod.unprocessed_blocks.get>
export type InsertDemandComment = z.infer<typeof Zod.demand_comment.insert>
export type DemandCommentRow = z.infer<typeof Zod.demand_comment.get>
export type InsertMatch2Comment = z.infer<typeof Zod.match2_comment.insert>
export type Match2CommentRow = z.infer<typeof Zod.match2_comment.get>

export type TABLES_TUPLE = typeof tablesList
export type TABLE = TABLES_TUPLE[number]
export type Models = {
  [key in TABLE]: {
    get: z.infer<(typeof Zod)[key]['get']>
    insert: Partial<z.infer<(typeof Zod)[key]['get']>> & z.infer<(typeof Zod)[key]['insert']>
  }
}

export type ColumnsByType<M extends TABLE, T> = {
  [K in keyof Models[M]['get']]-?: Models[M]['get'][K] extends T ? K : never
}[keyof Models[M]['get']]

type WhereComparison<M extends TABLE> = {
  [key in keyof Models[M]['get']]:
    | Readonly<
        [
          Extract<key, string>,
          '=' | '>' | '>=' | '<' | '<=' | '<>' | 'LIKE' | 'ILIKE',
          Extract<Models[M]['get'][key], Knex.Value | bigint>,
        ]
      >
    | Readonly<[Extract<key, string>, 'IN' | 'NOT_IN', Extract<Models[M]['get'][key], Knex.Value>[]]>
}
export type WhereMatch<M extends TABLE> = {
  [key in keyof Models[M]['get']]?: Models[M]['get'][key]
}

export type Where<M extends TABLE> = WhereMatch<M> | (WhereMatch<M> | WhereComparison<M>[keyof Models[M]['get']])[]
export type Order<M extends TABLE> = [keyof Models[M]['get'], 'asc' | 'desc'][]
export type Update<M extends TABLE> = Partial<Models[M]['get']>

export type IDatabase = {
  [key in TABLE]: () => Knex.QueryBuilder
}

export default Zod
