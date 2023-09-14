import { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "transaction_type" ADD VALUE \'cancellation\'')
  await knex.raw('ALTER TYPE "match2_state" ADD VALUE \'cancellation\'')
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "transaction_type" REMOVE VALUE \'cancellation\'')
  await knex.raw('ALTER TYPE "match2_state" REMOVE VALUE \'cancellation\'')
}
