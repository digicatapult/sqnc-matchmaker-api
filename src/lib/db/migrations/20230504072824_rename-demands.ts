import type { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.raw("ALTER TYPE \"demand_subtype\" RENAME VALUE 'order' TO 'demand_a'")
  await knex.raw("ALTER TYPE \"demand_subtype\" RENAME VALUE 'capacity' TO 'demand_b'")

  await knex.raw("ALTER TYPE \"api_type\" RENAME VALUE 'order' TO 'demand_a'")
  await knex.raw("ALTER TYPE \"api_type\" RENAME VALUE 'capacity' TO 'demand_b'")
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw("ALTER TYPE \"demand_subtype\" RENAME VALUE 'demand_a' TO 'order'")
  await knex.raw("ALTER TYPE \"demand_subtype\" RENAME VALUE 'demand_b' TO 'capacity'")

  await knex.raw("ALTER TYPE \"api_type\" RENAME VALUE 'demand_a' TO 'order'")
  await knex.raw("ALTER TYPE \"api_type\" RENAME VALUE 'demand_b' TO 'capacity'")
}
