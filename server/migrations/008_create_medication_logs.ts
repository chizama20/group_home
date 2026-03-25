import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('medication_logs', (table) => {
    table.uuid('id').primary()
    table.uuid('medication_id').notNullable().references('id').inTable('medications')
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.uuid('administered_by').notNullable().references('id').inTable('users')
    table.enum('outcome', ['given', 'refused', 'missed', 'held']).notNullable()
    table.text('notes').nullable()
    table.datetime('administered_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('medication_logs')
}
