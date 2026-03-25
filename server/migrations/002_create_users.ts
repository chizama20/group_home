import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary()
    table.uuid('org_id').notNullable().references('id').inTable('orgs')
    table.string('email', 255).notNullable().unique()
    table.string('password_hash', 255).notNullable()
    table.string('first_name', 100).notNullable()
    table.string('last_name', 100).notNullable()
    table.enum('role', ['employee', 'manager', 'org_admin']).notNullable()
    table.boolean('is_active').defaultTo(true)
    table.uuid('invited_by').nullable().references('id').inTable('users')
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}
