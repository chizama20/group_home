import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('invitations', (table) => {
    table.uuid('id').primary()
    table.uuid('org_id').notNullable().references('id').inTable('orgs')
    table.uuid('home_id').nullable().references('id').inTable('homes')
    table.string('email', 255).notNullable()
    table.enum('role', ['employee', 'manager']).notNullable()
    table.string('token', 255).notNullable().unique()
    table.uuid('invited_by').notNullable().references('id').inTable('users')
    table.datetime('expires_at').notNullable()
    table.datetime('accepted_at').nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('invitations')
}
