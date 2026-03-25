import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('announcements', (table) => {
    table.uuid('id').primary()
    table.uuid('org_id').notNullable().references('id').inTable('orgs')
    table.uuid('home_id').nullable().references('id').inTable('homes')  // NULL = all homes
    table.uuid('posted_by').notNullable().references('id').inTable('users')
    table.string('title', 255).notNullable()
    table.text('body').notNullable()
    table.boolean('is_pinned').defaultTo(false)
    table.datetime('created_at').defaultTo(knex.fn.now())
    table.datetime('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('announcements')
}
