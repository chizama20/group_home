import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shift_notes', (table) => {
    table.uuid('id').primary()
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.uuid('resident_id').nullable().references('id').inTable('residents')
    table.enum('shift', ['morning', 'afternoon', 'overnight']).notNullable()
    table.date('shift_date').notNullable()
    table.text('content').notNullable()
    table.boolean('flagged').defaultTo(false)
    table.datetime('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('shift_notes')
}
