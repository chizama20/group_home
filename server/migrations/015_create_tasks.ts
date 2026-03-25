import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary()
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('created_by').notNullable().references('id').inTable('users')
    table.string('title', 255).notNullable()
    table.text('description').nullable()
    table.date('due_date').nullable()
    table.uuid('claimed_by').nullable().references('id').inTable('users')
    table.datetime('claimed_at').nullable()
    table.datetime('completed_at').nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('tasks')
}
