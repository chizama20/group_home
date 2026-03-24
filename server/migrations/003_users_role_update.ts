import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Migrate any existing 'admin' users to 'owner'
  await knex('users').where({ role: 'admin' }).update({ role: 'owner' });

  // Update the enum to the new three-role system
  await knex.raw(`
    ALTER TABLE users
    MODIFY COLUMN role ENUM('owner', 'manager', 'staff') NOT NULL DEFAULT 'staff'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex('users').where({ role: 'owner' }).update({ role: 'admin' });
  await knex.raw(`
    ALTER TABLE users
    MODIFY COLUMN role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff'
  `);
}
