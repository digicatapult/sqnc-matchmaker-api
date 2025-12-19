import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('unprocessed_blocks', (def) => {
    def.specificType('hash', 'CHAR(64)').notNullable()
    def.bigInteger('height').unsigned().notNullable().unique()
    def.specificType('parent', 'CHAR(64)').notNullable()
    def.datetime('created_at').notNullable().defaultTo(knex.fn.now())

    def.primary(['hash'])
    def.index('height')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('unprocessed_blocks')
}
