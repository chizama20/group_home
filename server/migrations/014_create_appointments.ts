import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('appointments', (table) => {
    table.uuid('id').primary()
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('scheduled_by').notNullable().references('id').inTable('users')
    table.enum('type', ['medical', 'dental', 'therapy', 'psychiatric', 'eye', 'lab', 'other']).notNullable()
    table.string('title', 255).notNullable()
    table.date('appointment_date').notNullable()
    table.time('appointment_time').nullable()
    table.string('location', 255).nullable()
    table.text('notes').nullable()
    table.string('collector_name', 255).nullable()
    table.string('collector_phone', 50).nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('appointments')
}
