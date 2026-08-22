import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('phone', 50).nullable();
    table.json('notification_prefs').nullable();
    table.datetime('last_seen_schedule_change_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('phone');
    table.dropColumn('notification_prefs');
    table.dropColumn('last_seen_schedule_change_at');
  });
}
