import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('transaction', function (def) {
    def.specificType('hash', 'CHAR(64)').notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('transaction', function (def) {
    def.dropColumn('hash')
  })
}
