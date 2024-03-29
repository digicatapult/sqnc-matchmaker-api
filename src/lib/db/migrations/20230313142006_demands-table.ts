import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('demand', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.string('owner', 48).notNullable()

    def
      .enum('subtype', ['order', 'capacity'], {
        enumName: 'demand_subtype',
        useNative: true,
      })
      .notNullable()

    def
      .enum('state', ['created', 'allocated'], {
        enumName: 'demand_state',
        useNative: true,
      })
      .notNullable()

    def.uuid('parameters_attachment_id').notNullable()
    def.integer('latest_token_id')
    def.integer('original_token_id')
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def.primary(['id'])
    def
      .foreign('parameters_attachment_id')
      .references('id')
      .inTable('attachment')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('demand')
}
