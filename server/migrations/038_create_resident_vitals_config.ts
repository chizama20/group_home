import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('resident_vitals_config', (table) => {
    table.uuid('id').primary()
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.string('vital_type', 50).notNullable()
    table.string('label', 100).nullable()
    table.string('frequency', 100).nullable()
    table.string('meal_timing', 50).nullable()
    table.decimal('target_min', 7, 2).nullable()
    table.decimal('target_max', 7, 2).nullable()
    table.string('unit', 20).nullable()
    table.boolean('is_active').defaultTo(true)
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('resident_vitals_config')
}
