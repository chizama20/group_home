import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('org_requests', (table) => {
    table.uuid('id').primary()
    table.string('org_name', 255).notNullable()
    table.string('contact_name', 255).notNullable()
    table.string('contact_email', 255).notNullable()
    table.string('contact_phone', 50).notNullable()
    table.integer('num_homes').notNullable()
    table.string('state', 2).notNullable()
    table.enum('facility_type', ['group_home','assisted_living','foster_care','supported_living','day_program','other']).notNullable()
    table.text('current_operations').nullable()
    table.text('additional_notes').nullable()
    table.enum('status', ['pending','approved','rejected']).notNullable().defaultTo('pending')
    table.text('rejection_reason').nullable()
    table.datetime('reviewed_at').nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('org_requests')
}
