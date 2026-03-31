import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('residents', (table) => {
    table.text('metadata').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('residents', (table) => {
    table.dropColumn('metadata')
  })
}
