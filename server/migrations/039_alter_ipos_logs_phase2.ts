import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ipos_logs', (table) => {
    table.dropUnique(['resident_id', 'shift', 'log_date'])
    table.dropColumn('user_id')
    table.dropColumn('shift')
    table.dropColumn('content')
    table.string('status', 20).notNullable().defaultTo('draft')
    table.datetime('submitted_at').nullable()
    table.uuid('approved_by').nullable()
    table.datetime('approved_at').nullable()
    table.unique(['resident_id', 'log_date'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ipos_logs', (table) => {
    table.dropUnique(['resident_id', 'log_date'])
    table.dropColumn('approved_at')
    table.dropColumn('approved_by')
    table.dropColumn('submitted_at')
    table.dropColumn('status')
    table.uuid('user_id').notNullable()
    table.string('shift', 20).notNullable()
    table.text('content').notNullable()
    table.unique(['resident_id', 'shift', 'log_date'])
  })
}
