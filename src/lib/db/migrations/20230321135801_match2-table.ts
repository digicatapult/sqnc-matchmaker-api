import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('match2', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.string('optimiser', 48).notNullable()
    def.string('member_a', 48).notNullable()
    def.string('member_b', 48).notNullable()

    def
      .enum('state', ['proposed', 'acceptedA', 'acceptedB', 'acceptedFinal'], {
        enumName: 'match2_state',
        useNative: true,
      })
      .notNullable()

    def.integer('latest_token_id')
    def.integer('original_token_id')

    def.uuid('demand_a_id').notNullable()
    def.uuid('demand_b_id').notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())
    def.datetime('updated_at').notNullable().defaultTo(now())

    def.primary(['id'])
    def.foreign('demand_a_id').references('id').inTable('demand').onDelete('CASCADE').onUpdate('CASCADE')
    def.foreign('demand_b_id').references('id').inTable('demand').onDelete('CASCADE').onUpdate('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('match2')
}
