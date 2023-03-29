import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('transaction', function (table) {
    table.dropColumn('token_id')
    table.dropColumn('token_type')
    table.enu('api_type', ['match2', 'order', 'capacity'], { useNative: true, enumName: 'api_type' })
    table.enu('transaction_type', ['creation', 'proposal', 'accept'], { useNative: true, enumName: 'transaction_type' })
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('transaction', function (table) {
    table.integer('token_id')
    table.enu('token_type', ['DEMAND', 'MATCH2'], {
      enumName: 'type',
      useNative: true,
    })
    table.dropColumn('transaction_type')
    table.dropColumn('api_type')
  })
}
