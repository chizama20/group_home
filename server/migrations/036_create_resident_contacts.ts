import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('resident_contacts', (table) => {
    table.uuid('id').primary()
    table.uuid('resident_id').notNullable().references('id').inTable('residents')
    table.string('name', 255).notNullable()
    table.string('relationship', 100).nullable()
    table.string('phone', 50).nullable()
    table.string('email', 255).nullable()
    table.boolean('is_emergency_contact').defaultTo(false)
    table.boolean('notify_on_incident').defaultTo(false)
    table.boolean('is_active').defaultTo(true)
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('resident_contacts')
}
