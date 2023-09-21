import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TYPE "demand_state" ADD VALUE \'cancelled\'')
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TYPE "demand_state" REMOVE VALUE \'cancelled\'')
}
