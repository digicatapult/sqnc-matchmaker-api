import type { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('attachment', (def) => {
    def.string('filename').nullable().alter()
  })
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('attachment', (def) => {
    def.string('filename').notNullable().alter()
  })
}
