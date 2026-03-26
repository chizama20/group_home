import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('shift_roster', (table) => {
    table.datetime('clocked_in_at').nullable()
    table.datetime('clocked_out_at').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('shift_roster', (table) => {
    table.dropColumn('clocked_in_at')
    table.dropColumn('clocked_out_at')
  })
}
