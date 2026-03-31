import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE orgs
    ADD COLUMN status ENUM('pending','pending_baa','active','suspended') NOT NULL DEFAULT 'active',
    ADD COLUMN baa_envelope_id VARCHAR(255) NULL,
    ADD COLUMN baa_signed_at DATETIME NULL
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE orgs
    DROP COLUMN status,
    DROP COLUMN baa_envelope_id,
    DROP COLUMN baa_signed_at
  `)
}
