import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.string('phone').nullable();
    t.string('position').nullable();
    t.boolean('active').notNullable().defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('phone');
    t.dropColumn('position');
    t.dropColumn('active');
  });
}
