import { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "demand_state" ADD VALUE \'pending\'')
  await knex.raw('ALTER TYPE "match2_state" ADD VALUE \'pending\'')
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "demand_state" REMOVE VALUE \'pending\'')
  await knex.raw('ALTER TYPE "match2_state" REMOVE VALUE \'pending\'')
}
