import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('vitals_logs', (table) => {
    table.uuid('id').primary()
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.uuid('home_id').notNullable().references('id').inTable('homes')
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.string('vital_type', 50).notNullable()
    table.decimal('value_primary', 7, 2).notNullable()
    table.decimal('value_secondary', 7, 2).nullable()
    table.string('unit', 20).nullable()
    table.string('meal_timing', 50).nullable()
    table.text('notes').nullable()
    table.boolean('is_flagged').defaultTo(false)
    table.uuid('acknowledged_by').nullable()
    table.datetime('acknowledged_at').nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('vitals_logs')
}
