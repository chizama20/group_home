import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ipos_logs', (table) => {
    table.uuid('id').primary()
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.enum('shift', ['morning', 'afternoon', 'overnight']).notNullable()
    table.date('log_date').notNullable()
    table.text('content').notNullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
    table.unique(['resident_id', 'shift', 'log_date'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('ipos_logs')
}
