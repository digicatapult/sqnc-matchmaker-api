import type { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('match2', (def) => {
    def.uuid('replaces_id').nullable()
    def
      .foreign(['replaces_id'], 'match2-replaces-id-match2')
      .references(['id'])
      .inTable('match2')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
  })
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('match2', (def) => {
    def.dropForeign(['replaces_id'], 'match2-replaces-id-match2')
    def.dropColumn('replaces_id')
  })
}
