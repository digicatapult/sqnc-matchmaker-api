import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('demand', (def) => {
    def.dropForeign(['parameters_attachment_id'])
  })

  await knex.schema.alterTable('demand_comment', (def) => {
    def.dropForeign(['attachment'])
    def.renameColumn('attachment', 'attachment_id')
  })

  await knex.schema.alterTable('match2_comment', (def) => {
    def.dropForeign(['attachment'])
    def.renameColumn('attachment', 'attachment_id')
  })

  await knex.schema.dropTable('attachment')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('attachment', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.string('ipfs_hash').notNullable()
    def.string('filename').nullable()
    def.bigInteger('size').nullable()
    def.datetime('created_at').notNullable().defaultTo(knex.fn.now())

    def.primary(['id'])
  })

  // create a default value so we can insert a dummy attachment. This way we can sort of go back
  const [{ id }] = await knex('attachment')
    .insert({
      ipfs_hash: 'unknown',
    })
    .returning('id')

  await knex('demand').update({
    parameters_attachment_id: id,
  })
  await knex.schema.alterTable('demand', (def) => {
    def
      .foreign('parameters_attachment_id')
      .references('id')
      .inTable('attachment')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
  })

  await knex('demand_comment').update({
    attachment: id,
  })
  await knex.schema.alterTable('demand_comment', (def) => {
    def.renameColumn('attachment_id', 'attachment')
    def.foreign('attachment').references('id').inTable('attachment').onDelete('CASCADE').onUpdate('CASCADE')
  })

  await knex('match2_comment').update({
    attachment: id,
  })
  await knex.schema.alterTable('match2_comment', (def) => {
    def.renameColumn('attachment_id', 'attachment')
    def.foreign('attachment').references('id').inTable('attachment').onDelete('CASCADE').onUpdate('CASCADE')
  })
}
