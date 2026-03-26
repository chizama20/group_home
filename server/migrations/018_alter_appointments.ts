import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('appointments', (table) => {
    table.uuid('completed_by').nullable().references('id').inTable('users')
    table.datetime('completed_at').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('appointments', (table) => {
    table.dropColumn('completed_by')
    table.dropColumn('completed_at')
  })
}
