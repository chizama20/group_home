import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('medication_logs', (table) => {
    table.string('signature_token', 255).nullable()
    table.datetime('signed_at').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('medication_logs', (table) => {
    table.dropColumn('signature_token')
    table.dropColumn('signed_at')
  })
}
