import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('attachments', (def) => {
        def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
        def.string('filename', 255).notNullable()
        def.binary('binary_blob').notNullable()
        def.datetime('created_at').notNullable().defaultTo(knex.fn.now())
    
        def.primary(['id'])
      })
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('attachments')
}

