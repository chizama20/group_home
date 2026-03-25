import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('home_staff', (table) => {
    table.uuid('id').primary()
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.uuid('added_by').nullable().references('id').inTable('users')
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.unique(['home_id', 'user_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('home_staff')
}
