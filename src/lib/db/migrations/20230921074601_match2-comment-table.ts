import type { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  const now = () => knex.fn.now()
  await knex.schema.createTable('match2_comment', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.string('owner', 48).notNullable()
    def.enum('state', ['pending', 'created'], { enumName: 'match2_comment_state', useNative: true }).notNullable()
    def.uuid('match2').notNullable()
    def.uuid('attachment').notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())
    def.uuid('transaction_id').nullable()
    def.primary(['id'])
    def
      .foreign(['transaction_id', 'match2'], 'match2-comment-transaction-id-match2')
      .references(['id', 'local_id'])
      .inTable('transaction')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    def.foreign('match2').references('id').inTable('match2').onDelete('CASCADE').onUpdate('CASCADE')
    def.foreign('attachment').references('id').inTable('attachment').onDelete('CASCADE').onUpdate('CASCADE')
  })
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTable('match2_comment')
}
