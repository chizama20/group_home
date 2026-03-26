import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('medications', (table) => {
    table.string('prescriber', 255).nullable()
    table.uuid('created_by').nullable().references('id').inTable('users')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('medications', (table) => {
    table.dropColumn('prescriber')
    table.dropColumn('created_by')
  })
}
