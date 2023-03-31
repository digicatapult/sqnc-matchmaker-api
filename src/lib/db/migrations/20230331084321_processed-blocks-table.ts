import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('processed_blocks', (def) => {
    def.specificType('hash', 'CHAR(64)').notNullable()
    def.bigInteger('height').unsigned().notNullable().unique()
    def.specificType('parent', 'CHAR(64)').notNullable()
    def.datetime('created_at').notNullable().defaultTo(knex.fn.now())

    def.primary(['hash'])
  })

  await knex.schema.alterTable('processed_blocks', (def) => {
    def.foreign('parent', 'fk_processed_blocks_parent_hash').references('hash').inTable('processed_blocks')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('processed_blocks')
}
