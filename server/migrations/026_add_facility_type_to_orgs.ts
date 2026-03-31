import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE orgs
    ADD COLUMN facility_type ENUM('group_home','assisted_living','foster_care','supported_living','day_program','other')
    NOT NULL DEFAULT 'group_home'
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE orgs DROP COLUMN facility_type`)
}
