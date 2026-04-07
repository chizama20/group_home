import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ipos_entries', (table) => {
    table.uuid('id').primary()
    table.uuid('log_id').notNullable().references('id').inTable('ipos_logs')
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.string('shift', 10).notNullable()
    table.uuid('goal_id').nullable()
    table.string('task_id_code', 20).nullable()
    table.integer('cls_minutes').defaultTo(0)
    table.integer('pc_minutes').defaultTo(0)
    table.string('progress_code', 10).nullable()
    table.text('narrative').nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('ipos_entries')
}
