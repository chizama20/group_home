import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tracked_behaviors', (table) => {
    table.uuid('id').primary()
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.string('name', 255).notNullable()
    table.text('description').nullable()
    table.boolean('is_active').defaultTo(true)
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('tracked_behaviors')
}
