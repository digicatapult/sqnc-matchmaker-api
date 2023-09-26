import { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "match2_state" ADD VALUE \'rematched\'')
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "match2_state" REMOVE VALUE \'rematched\'')
}
