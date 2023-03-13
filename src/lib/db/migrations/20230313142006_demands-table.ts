import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('demands', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.string('owner', 48).notNullable()

    def
      .enum('subtype', ['Order', 'Capacity'], {
        enumName: 'demand_subtype',
        useNative: true,
      })
      .notNullable()

    def
      .enum('status', ['Created', 'Allocated'], {
        enumName: 'demand_status',
        useNative: true,
      })
      .notNullable()

    def.uuid('demands_attachment_id').notNullable()
    def.integer('latest_token_id')
    def.integer('original_token_id')
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def.primary(['id'])
    def.foreign('demands_attachment_id').references('id').inTable('attachments').onDelete('CASCADE').onUpdate('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('attachments')
}
