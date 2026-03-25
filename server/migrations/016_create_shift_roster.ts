import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shift_roster', (table) => {
    table.uuid('id').primary()
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.enum('shift', ['morning', 'afternoon', 'overnight']).notNullable()
    table.date('shift_date').notNullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.unique(['home_id', 'user_id', 'shift', 'shift_date'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('shift_roster')
}
