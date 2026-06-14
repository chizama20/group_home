import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shift_slots', (table) => {
    table.uuid('id').primary()
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.date('date').notNullable()
    table.enum('shift_type', ['day', 'evening', 'night']).notNullable()
    table.enum('status', ['scheduled', 'cancelled']).notNullable().defaultTo('scheduled')
    table.text('notes').nullable()
    table.uuid('created_by').nullable().references('id').inTable('users')
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('shift_slots')
}
