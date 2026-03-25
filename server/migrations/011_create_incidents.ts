import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('incidents', (table) => {
    table.uuid('id').primary()
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('reported_by').notNullable().references('id').inTable('users')
    table.string('title', 255).notNullable()
    table.text('description').notNullable()
    table.enum('status', ['open', 'reviewed', 'closed']).notNullable().defaultTo('open')
    table.uuid('signed_off_by').nullable().references('id').inTable('users')
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('incidents')
}
