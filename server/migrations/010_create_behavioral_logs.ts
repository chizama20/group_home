import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('behavioral_logs', (table) => {
    table.uuid('id').primary()
    table.uuid('behavior_id').notNullable().references('id').inTable('tracked_behaviors')
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.text('notes').nullable()
    table.datetime('occurred_at').notNullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('behavioral_logs')
}
