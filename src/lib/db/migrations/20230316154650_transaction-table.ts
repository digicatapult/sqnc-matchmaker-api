import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('transaction', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def
      .enum('token_type', ['DEMAND', 'MATCH2'], {
        enumName: 'type',
        useNative: true,
      })
      .notNullable()

    def.uuid('local_id').notNullable()

    def
      .enum('status', ['submitted', 'inBlock', 'finalised', 'failed'], {
        enumName: 'transaction_status',
        useNative: true,
      })
      .notNullable()

    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def.integer('chain_id')

    def.primary(['id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('transaction')
}
