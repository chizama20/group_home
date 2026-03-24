import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add as nullable first (can't add NOT NULL to a table with existing rows without a default)
  await knex.schema.alterTable('users', (t) => {
    t.integer('organization_id').unsigned().nullable().after('id');
  });

  // 2. Create a dev org for any existing users
  let org = await knex('organizations').where({ slug: 'dev-home' }).first();
  if (!org) {
    const [insertId] = await knex('organizations').insert({ name: 'Dev Home', slug: 'dev-home' });
    org = { id: insertId };
  }

  // 3. Backfill existing users to that org
  await knex('users').update({ organization_id: org.id });

  // 4. Make NOT NULL, add FK, replace email unique with org-scoped composite unique
  await knex.raw('ALTER TABLE users MODIFY COLUMN organization_id INT UNSIGNED NOT NULL');
  await knex.raw('ALTER TABLE users ADD CONSTRAINT fk_users_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE');
  await knex.raw('ALTER TABLE users DROP INDEX users_email_unique');
  await knex.raw('ALTER TABLE users ADD UNIQUE KEY uq_users_org_email (organization_id, email)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE users DROP FOREIGN KEY fk_users_org');
  await knex.raw('ALTER TABLE users DROP INDEX uq_users_org_email');
  await knex.raw('ALTER TABLE users ADD UNIQUE KEY users_email_unique (email)');
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('organization_id');
  });
}
