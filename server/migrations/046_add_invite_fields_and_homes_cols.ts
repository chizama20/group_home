import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add first_name, last_name, home_ids (JSON array), resent_at to invitations
  await knex.schema.alterTable('invitations', (table) => {
    table.string('first_name', 100).nullable()
    table.string('last_name', 100).nullable()
    table.text('home_ids').nullable()        // stored as JSON string
    table.datetime('resent_at').nullable()
  })

  // Add phone and facility_type to homes
  await knex.schema.alterTable('homes', (table) => {
    table.string('phone', 50).nullable()
    table.enum('facility_type', ['group_home','assisted_living','foster_care','supported_living','day_program','other']).nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('homes', (table) => {
    table.dropColumn('facility_type')
    table.dropColumn('phone')
  })

  await knex.schema.alterTable('invitations', (table) => {
    table.dropColumn('resent_at')
    table.dropColumn('home_ids')
    table.dropColumn('last_name')
    table.dropColumn('first_name')
  })
}
