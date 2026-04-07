import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('day_program_logs', (table) => {
    table.uuid('id').primary()
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('logged_by').notNullable().references('id').inTable('users')
    table.string('program_name', 255).notNullable()
    table.text('program_address').nullable()
    table.string('transport_staff', 255).nullable()
    table.string('transport_method', 100).nullable()
    table.datetime('departed_at').notNullable()
    table.datetime('returned_at').nullable()
    table.text('return_notes').nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('day_program_logs')
}
