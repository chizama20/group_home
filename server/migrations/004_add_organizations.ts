import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('organizations', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('slug', 100).notNullable().unique();
    t.enum('plan', ['trial', 'active', 'suspended']).notNullable().defaultTo('trial');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('organizations');
}
