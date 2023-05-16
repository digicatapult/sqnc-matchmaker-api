import { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('demand_comment', (def) => {
    def.dropPrimary()
  })

  await knex.schema.alterTable('demand_comment', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).alter()
    def.uuid('transaction_id').nullable()
    def.dropForeign(['id', 'demand'], 'demand-comment-transaction-id-demand')
  })

  await knex.schema.alterTable('demand_comment', (def) => {
    def.primary(['id'])
    def
      .foreign(['transaction_id', 'demand'], 'demand-comment-transaction-id-demand')
      .references(['id', 'local_id'])
      .inTable('transaction')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
  })

  await knex('demand_comment').update({
    transaction_id: knex.raw('??', ['id']),
  })
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('demand_comment', (def) => {
    def.dropPrimary()
    def.dropForeign(['transaction_id', 'demand'], 'demand-comment-transaction-id-demand')
  })

  await knex.schema.alterTable('demand_comment', (def) => {
    def
      .foreign(['id', 'demand'], 'demand-comment-transaction-id-demand')
      .references(['id', 'local_id'])
      .inTable('transaction')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    def.dropColumn('transaction_id')
    def.uuid('id').notNullable().defaultTo(null).alter()
  })

  await knex.schema.alterTable('demand_comment', (def) => {
    def.primary(['id'])
  })
}
