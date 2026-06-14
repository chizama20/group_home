import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shift_requests', (table) => {
    table.uuid('id').primary()
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('requester_id').notNullable().references('id').inTable('users')
    table.uuid('slot_id').nullable().references('id').inTable('shift_slots')
    table.enum('type', ['time_off']).notNullable()
    table.date('date').notNullable()
    table.enum('shift_type', ['day', 'evening', 'night']).notNullable()
    table.text('reason').nullable()
    table.uuid('replacement_user_id').nullable().references('id').inTable('users')
    table.enum('status', ['pending', 'approved', 'denied']).notNullable().defaultTo('pending')
    table.uuid('reviewed_by').nullable().references('id').inTable('users')
    table.datetime('reviewed_at').nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('shift_requests')
}
