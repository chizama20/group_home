import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shift_selections', (table) => {
    table.uuid('id').primary()
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.date('selection_date').notNullable()
    table.text('shifts').notNullable()
    table.datetime('selected_at').defaultTo(knex.fn.now())
    table.unique(['user_id', 'home_id', 'selection_date'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('shift_selections')
}
