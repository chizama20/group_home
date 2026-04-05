import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // residents
  await knex.schema.alterTable('residents', (table) => {
    table.index(['home_id'], 'idx_residents_home_id');
    table.index(['date_of_birth'], 'idx_residents_date_of_birth');
  });

  // users
  await knex.schema.alterTable('users', (table) => {
    table.index(['org_id'], 'idx_users_org_id');
  });

  // homes
  await knex.schema.alterTable('homes', (table) => {
    table.index(['org_id'], 'idx_homes_org_id');
  });

  // ipos_logs — unique(resident_id, shift, log_date) covers resident_id prefix;
  // add standalone indexes for home_id, log_date, and shift
  await knex.schema.alterTable('ipos_logs', (table) => {
    table.index(['home_id'], 'idx_ipos_logs_home_id');
    table.index(['log_date'], 'idx_ipos_logs_log_date');
    table.index(['shift'], 'idx_ipos_logs_shift');
  });

  // behavioral_logs — no home_id column in this table
  await knex.schema.alterTable('behavioral_logs', (table) => {
    table.index(['resident_id'], 'idx_behavioral_logs_resident_id');
    table.index(['occurred_at'], 'idx_behavioral_logs_occurred_at');
  });

  // incidents
  await knex.schema.alterTable('incidents', (table) => {
    table.index(['resident_id'], 'idx_incidents_resident_id');
    table.index(['home_id'], 'idx_incidents_home_id');
    table.index(['created_at'], 'idx_incidents_created_at');
  });

  // medications
  await knex.schema.alterTable('medications', (table) => {
    table.index(['resident_id'], 'idx_medications_resident_id');
  });

  // medication_logs
  await knex.schema.alterTable('medication_logs', (table) => {
    table.index(['medication_id'], 'idx_medication_logs_medication_id');
    table.index(['resident_id'], 'idx_medication_logs_resident_id');
    table.index(['administered_at'], 'idx_medication_logs_administered_at');
  });

  // appointments
  await knex.schema.alterTable('appointments', (table) => {
    table.index(['resident_id'], 'idx_appointments_resident_id');
    table.index(['home_id'], 'idx_appointments_home_id');
    table.index(['appointment_date'], 'idx_appointments_appointment_date');
  });

  // shift_roster — unique(home_id, user_id, shift, shift_date) covers home_id prefix;
  // add standalone index for shift_date
  await knex.schema.alterTable('shift_roster', (table) => {
    table.index(['shift_date'], 'idx_shift_roster_shift_date');
  });

  // audit_logs
  await knex.schema.alterTable('audit_logs', (table) => {
    table.index(['org_id'], 'idx_audit_logs_org_id');
    table.index(['user_id'], 'idx_audit_logs_user_id');
    table.index(['created_at'], 'idx_audit_logs_created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('residents', (table) => {
    table.dropIndex([], 'idx_residents_home_id');
    table.dropIndex([], 'idx_residents_date_of_birth');
  });

  await knex.schema.alterTable('users', (table) => {
    table.dropIndex([], 'idx_users_org_id');
  });

  await knex.schema.alterTable('homes', (table) => {
    table.dropIndex([], 'idx_homes_org_id');
  });

  await knex.schema.alterTable('ipos_logs', (table) => {
    table.dropIndex([], 'idx_ipos_logs_home_id');
    table.dropIndex([], 'idx_ipos_logs_log_date');
    table.dropIndex([], 'idx_ipos_logs_shift');
  });

  await knex.schema.alterTable('behavioral_logs', (table) => {
    table.dropIndex([], 'idx_behavioral_logs_resident_id');
    table.dropIndex([], 'idx_behavioral_logs_occurred_at');
  });

  await knex.schema.alterTable('incidents', (table) => {
    table.dropIndex([], 'idx_incidents_resident_id');
    table.dropIndex([], 'idx_incidents_home_id');
    table.dropIndex([], 'idx_incidents_created_at');
  });

  await knex.schema.alterTable('medications', (table) => {
    table.dropIndex([], 'idx_medications_resident_id');
  });

  await knex.schema.alterTable('medication_logs', (table) => {
    table.dropIndex([], 'idx_medication_logs_medication_id');
    table.dropIndex([], 'idx_medication_logs_resident_id');
    table.dropIndex([], 'idx_medication_logs_administered_at');
  });

  await knex.schema.alterTable('appointments', (table) => {
    table.dropIndex([], 'idx_appointments_resident_id');
    table.dropIndex([], 'idx_appointments_home_id');
    table.dropIndex([], 'idx_appointments_appointment_date');
  });

  await knex.schema.alterTable('shift_roster', (table) => {
    table.dropIndex([], 'idx_shift_roster_shift_date');
  });

  await knex.schema.alterTable('audit_logs', (table) => {
    table.dropIndex([], 'idx_audit_logs_org_id');
    table.dropIndex([], 'idx_audit_logs_user_id');
    table.dropIndex([], 'idx_audit_logs_created_at');
  });
}
