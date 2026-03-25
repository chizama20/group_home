import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('residents', (table) => {
    table.uuid('id').primary()
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.string('first_name', 100).notNullable()
    table.string('last_name', 100).notNullable()
    table.date('date_of_birth').notNullable()
    table.string('room', 50).nullable()
    table.text('diagnosis').nullable()
    table.string('physician', 255).nullable()
    table.string('primary_contact_name', 255).nullable()
    table.string('primary_contact_phone', 50).nullable()
    table.string('primary_contact_relation', 100).nullable()
    table.text('notes').nullable()
    table.boolean('is_active').defaultTo(true)
    table.uuid('created_by').notNullable().references('id').inTable('users')
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('residents')
}
