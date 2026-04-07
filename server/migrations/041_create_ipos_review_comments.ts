import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ipos_review_comments', (table) => {
    table.uuid('id').primary()
    table.uuid('log_id').notNullable().references('id').inTable('ipos_logs')
    table.uuid('entry_id').nullable()
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.text('content').notNullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('ipos_review_comments')
}
