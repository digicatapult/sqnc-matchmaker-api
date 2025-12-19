import type { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "transaction_type" ADD VALUE \'rejection\'')
  await knex.raw('ALTER TYPE "match2_state" ADD VALUE \'rejected\'')
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "transaction_type" REMOVE VALUE \'rejection\'')
  await knex.raw('ALTER TYPE "match2_state" REMOVE VALUE \'rejection\'')
}
