import { Knex } from 'knex';

// Adds updated_at to tables that were created without it.
// Skipped: medications (has it from 007), incidents (has it from 011).

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('medication_logs', (table) => {
    table.datetime('updated_at').nullable().defaultTo(null);
  });

  await knex.schema.alterTable('behavioral_logs', (table) => {
    table.datetime('updated_at').nullable().defaultTo(null);
  });

  await knex.schema.alterTable('shift_notes', (table) => {
    table.datetime('updated_at').nullable().defaultTo(null);
  });

  await knex.schema.alterTable('shift_roster', (table) => {
    table.datetime('updated_at').nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('medication_logs', (table) => {
    table.dropColumn('updated_at');
  });

  await knex.schema.alterTable('behavioral_logs', (table) => {
    table.dropColumn('updated_at');
  });

  await knex.schema.alterTable('shift_notes', (table) => {
    table.dropColumn('updated_at');
  });

  await knex.schema.alterTable('shift_roster', (table) => {
    table.dropColumn('updated_at');
  });
}
