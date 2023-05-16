import { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  const now = () => knex.fn.now()

  await knex.schema.alterTable('transaction', (def) => {
    def.unique(['id', 'local_id'], {
      indexName: 'transaction-id-local-id',
    })
  })

  await knex.schema.createTable('demand_comment', (def) => {
    def.uuid('id').primary()
    def.string('owner', 48).notNullable()
    def.enum('state', ['pending', 'created'], { enumName: 'demand_comment_state', useNative: true }).notNullable()
    def.uuid('demand').notNullable()
    def.uuid('attachment').notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def
      .foreign(['id', 'demand'], 'demand-comment-transaction-id-demand')
      .references(['id', 'local_id'])
      .inTable('transaction')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    def.foreign('demand').references('id').inTable('demand').onDelete('CASCADE').onUpdate('CASCADE')
    def.foreign('attachment').references('id').inTable('attachment').onDelete('CASCADE').onUpdate('CASCADE')
  })

  await knex.raw('ALTER TYPE "transaction_type" ADD VALUE \'comment\'')
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw('ALTER TYPE "transaction_type" REMOVE VALUE \'comment\'')
  await knex.schema.dropTable('demand_comment')
  await knex.schema.alterTable('transaction', (def) => {
    def.dropUnique(['id', 'local_id'], 'transaction-id-local-id')
  })
}
