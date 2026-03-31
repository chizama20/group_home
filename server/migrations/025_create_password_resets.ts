import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('password_resets', (table) => {
    table.uuid('id').primary()
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.string('token', 255).notNullable().unique()
    table.datetime('expires_at').notNullable()
    table.datetime('used_at').nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('password_resets')
}
