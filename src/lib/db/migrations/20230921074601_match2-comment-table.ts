import { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  const now = () => knex.fn.now()
  await knex.schema.alterTable('transaction', (def) => {
    def.unique(['id', 'local_id'], {
      indexName: 'transaction-id-local-id-match2-comment',
    })
  })
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

  await knex('match2_comment').update({
    transaction_id: knex.raw('??', ['id']),
  })
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "transaction_type" REMOVE VALUE \'comment\'')
  await knex.schema.dropTable('match2_comment')
  await knex.schema.alterTable('transaction', (def) => {
    def.dropUnique(['id', 'local_id'], 'transaction-id-local-id-match2-comment')
  })

  await knex.schema.alterTable('match2_comment', (def) => {
    def.dropPrimary()
    def.dropForeign(['transaction_id', 'demand'], 'match2-comment-transaction-id-match2')
  })

  await knex.schema.alterTable('match2_comment', (def) => {
    def
      .foreign(['id', 'match2'], 'match2-comment-transaction-id-match2')
      .references(['id', 'local_id'])
      .inTable('transaction')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    def.dropColumn('transaction_id')
    def.uuid('id').notNullable().defaultTo(null).alter()
  })

  await knex.schema.alterTable('match2_comment', (def) => {
    def.primary(['id'])
  })
}
