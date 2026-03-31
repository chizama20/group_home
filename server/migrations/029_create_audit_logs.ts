import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary()
    table.uuid('org_id').notNullable().references('id').inTable('orgs')
    table.uuid('user_id').nullable().references('id').inTable('users')
    table.enum('action', ['LOGIN','LOGOUT','CREATE','READ','UPDATE','DELETE','SIGN','INVITE','EXPORT']).notNullable()
    table.string('entity_type', 100).notNullable()
    table.uuid('entity_id').nullable()
    table.text('description').nullable()
    table.string('ip_address', 45).nullable()
    table.text('user_agent').nullable()
    table.datetime('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('audit_logs')
}
