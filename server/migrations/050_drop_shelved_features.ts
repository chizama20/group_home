import { Knex } from 'knex';

// Phase 1 scope-down: MAR/medication-administration, Incidents, and Tasks are
// dropped entirely (not just their routes) — pre-launch, no real data to preserve.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('medication_logs');
  await knex.schema.dropTableIfExists('incidents');
  await knex.schema.dropTableIfExists('tasks');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('medication_logs', (table) => {
    table.uuid('id').primary();
    table.uuid('medication_id').notNullable().references('id').inTable('medications');
    table.uuid('resident_id').notNullable().references('id').inTable('residents');
    table.uuid('administered_by').notNullable().references('id').inTable('users');
    table.enum('outcome', ['given', 'partial', 'refused', 'missed', 'held']).notNullable();
    table.text('notes').nullable();
    table.datetime('administered_at').defaultTo(knex.fn.now());
    table.date('scheduled_date').nullable();
    table.string('signature_token', 255).nullable();
    table.datetime('signed_at').nullable();
    table.datetime('updated_at').defaultTo(knex.fn.now());
    table.index(['medication_id'], 'idx_medication_logs_medication_id');
    table.index(['resident_id'], 'idx_medication_logs_resident_id');
    table.index(['administered_at'], 'idx_medication_logs_administered_at');
    table.index(['resident_id', 'scheduled_date'], 'idx_med_logs_resident_date');
  });

  await knex.schema.createTable('incidents', (table) => {
    table.uuid('id').primary();
    table.uuid('resident_id').notNullable().references('id').inTable('residents');
    table.uuid('home_id').notNullable().references('id').inTable('homes');
    table.uuid('reported_by').notNullable().references('id').inTable('users');
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.string('incident_type', 100).nullable();
    table.enum('severity', ['low', 'medium', 'high']).nullable();
    table.datetime('occurred_at').nullable();
    table.enum('status', ['open', 'reviewed', 'closed', 'signed_off', 'escalated']).notNullable().defaultTo('open');
    table.uuid('signed_off_by').nullable().references('id').inTable('users');
    table.datetime('signed_off_at').nullable();
    table.uuid('escalated_to').nullable().references('id').inTable('users');
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    table.index(['resident_id'], 'idx_incidents_resident_id');
    table.index(['home_id'], 'idx_incidents_home_id');
    table.index(['created_at'], 'idx_incidents_created_at');
  });

  await knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary();
    table.uuid('home_id').notNullable().references('id').inTable('homes');
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.date('due_date').nullable();
    table.uuid('claimed_by').nullable().references('id').inTable('users');
    table.datetime('claimed_at').nullable();
    table.datetime('completed_at').nullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
  });
}
