import { Knex } from 'knex'

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('attachment', (def) => {
    def.dropColumn('binary_blob')
    def.string('ipfs_hash').notNullable()
    def.bigInteger('size').nullable()
  })
}

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable('attachment', (def) => {
    def.dropColumn('ipfs_hash')
    def.dropColumn('size')
    def.binary('binary_blob').notNullable()
  })
}
