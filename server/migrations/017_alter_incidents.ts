import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('incidents', (table) => {
    table.datetime('signed_off_at').nullable()
    table.uuid('escalated_to').nullable().references('id').inTable('users')
  })

  // Expand status enum to include 'signed_off' and 'escalated'
  await knex.raw(`
    ALTER TABLE incidents
    MODIFY COLUMN status ENUM('open','reviewed','closed','signed_off','escalated')
    NOT NULL DEFAULT 'open'
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE incidents
    MODIFY COLUMN status ENUM('open','reviewed','closed')
    NOT NULL DEFAULT 'open'
  `)

  await knex.schema.alterTable('incidents', (table) => {
    table.dropColumn('signed_off_at')
    table.dropColumn('escalated_to')
  })
}
