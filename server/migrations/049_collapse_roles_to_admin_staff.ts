import { Knex } from 'knex';

// employee/manager/org_admin → staff/admin. Portable across mysql2 (dev) and
// postgresql (staging/prod): swap in a plain column, backfill, then apply the
// enum/check constraint with client-specific DDL since knex has no single
// portable "alter enum values" primitive.
export async function up(knex: Knex): Promise<void> {
  const client = knex.client.config.client as string;
  const isMysql = client === 'mysql2' || client === 'mysql';

  // ── users.role ──────────────────────────────────────────────────────────
  await knex.schema.alterTable('users', (table) => {
    table.string('role_new', 20).nullable();
  });
  await knex('users').whereIn('role', ['org_admin', 'manager']).update({ role_new: 'admin' });
  await knex('users').where({ role: 'employee' }).update({ role_new: 'staff' });
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('role');
  });
  await knex.schema.alterTable('users', (table) => {
    table.renameColumn('role_new', 'role');
  });

  if (isMysql) {
    await knex.raw(`ALTER TABLE users MODIFY COLUMN role ENUM('staff','admin') NOT NULL`);
  } else {
    await knex.raw(`ALTER TABLE users ALTER COLUMN role SET NOT NULL`);
    await knex.raw(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('staff','admin'))`);
  }

  // ── invitations.role (only ever assignable role is 'staff') ───────────────
  await knex.schema.alterTable('invitations', (table) => {
    table.string('role_new', 20).nullable();
  });
  await knex('invitations').update({ role_new: 'staff' });
  await knex.schema.alterTable('invitations', (table) => {
    table.dropColumn('role');
  });
  await knex.schema.alterTable('invitations', (table) => {
    table.renameColumn('role_new', 'role');
  });

  if (isMysql) {
    await knex.raw(`ALTER TABLE invitations MODIFY COLUMN role ENUM('staff') NOT NULL`);
  } else {
    await knex.raw(`ALTER TABLE invitations ALTER COLUMN role SET NOT NULL`);
    await knex.raw(`ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('staff'))`);
  }

  // ── invitations.home_id: dead column, invites use home_ids (JSON) instead ─
  await knex.schema.alterTable('invitations', (table) => {
    table.dropForeign(['home_id']);
  });
  await knex.schema.alterTable('invitations', (table) => {
    table.dropColumn('home_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  const client = knex.client.config.client as string;
  const isMysql = client === 'mysql2' || client === 'mysql';

  await knex.schema.alterTable('invitations', (table) => {
    table.uuid('home_id').nullable().references('id').inTable('homes');
  });

  await knex.schema.alterTable('invitations', (table) => {
    table.string('role_old', 20).nullable();
  });
  await knex('invitations').update({ role_old: 'employee' });
  await knex.schema.alterTable('invitations', (table) => {
    table.dropColumn('role');
  });
  await knex.schema.alterTable('invitations', (table) => {
    table.renameColumn('role_old', 'role');
  });
  if (isMysql) {
    await knex.raw(`ALTER TABLE invitations MODIFY COLUMN role ENUM('employee','manager') NOT NULL`);
  } else {
    await knex.raw(`ALTER TABLE invitations ALTER COLUMN role SET NOT NULL`);
    await knex.raw(`ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('employee','manager'))`);
  }

  await knex.schema.alterTable('users', (table) => {
    table.string('role_old', 20).nullable();
  });
  await knex('users').where({ role: 'admin' }).update({ role_old: 'org_admin' });
  await knex('users').where({ role: 'staff' }).update({ role_old: 'employee' });
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('role');
  });
  await knex.schema.alterTable('users', (table) => {
    table.renameColumn('role_old', 'role');
  });
  if (isMysql) {
    await knex.raw(`ALTER TABLE users MODIFY COLUMN role ENUM('employee','manager','org_admin') NOT NULL`);
  } else {
    await knex.raw(`ALTER TABLE users ALTER COLUMN role SET NOT NULL`);
    await knex.raw(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('employee','manager','org_admin'))`);
  }
}
