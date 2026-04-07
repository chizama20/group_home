import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('medication_logs', (table) => {
    table.date('scheduled_date').nullable().after('notes')
    table.index(['resident_id', 'scheduled_date'], 'idx_med_logs_resident_date')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('medication_logs', (table) => {
    table.dropIndex([], 'idx_med_logs_resident_date')
    table.dropColumn('scheduled_date')
  })
}
