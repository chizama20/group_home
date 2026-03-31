import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('signing_pin_hash', 255).nullable()
    table.datetime('pin_set_at').nullable()
    table.datetime('last_active_at').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('signing_pin_hash')
    table.dropColumn('pin_set_at')
    table.dropColumn('last_active_at')
  })
}
