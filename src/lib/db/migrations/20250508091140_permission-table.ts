import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('permission', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.string('owner', 48).notNullable()

    def
      .enum('scope', ['member_a', 'member_b', 'optimiser'], {
        enumName: 'permission_scope',
        useNative: true,
      })
      .notNullable()

    def.integer('latest_token_id')
    def.integer('original_token_id')

    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def.primary(['id'])
    def.index(['owner', 'scope'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('permission')
}
