import { Knex } from 'knex';

// Shift trade/claim board reuses shift_requests: 'type' gains 'trade' and
// 'status' gains 'cancelled' (requester withdrawing an open offer). Same
// swap-column approach as migration 049 to stay portable across mysql2/postgresql.
export async function up(knex: Knex): Promise<void> {
  const client = knex.client.config.client as string;
  const isMysql = client === 'mysql2' || client === 'mysql';

  // ── type ────────────────────────────────────────────────────────────────
  await knex.schema.alterTable('shift_requests', (table) => {
    table.string('type_new', 20).nullable();
  });
  await knex('shift_requests').update({ type_new: knex.raw('type') });
  await knex.schema.alterTable('shift_requests', (table) => {
    table.dropColumn('type');
  });
  await knex.schema.alterTable('shift_requests', (table) => {
    table.renameColumn('type_new', 'type');
  });

  if (isMysql) {
    await knex.raw(`ALTER TABLE shift_requests MODIFY COLUMN type ENUM('time_off','trade') NOT NULL`);
  } else {
    await knex.raw(`ALTER TABLE shift_requests ALTER COLUMN type SET NOT NULL`);
    await knex.raw(`ALTER TABLE shift_requests ADD CONSTRAINT shift_requests_type_check CHECK (type IN ('time_off','trade'))`);
  }

  // ── status ──────────────────────────────────────────────────────────────
  await knex.schema.alterTable('shift_requests', (table) => {
    table.string('status_new', 20).nullable();
  });
  await knex('shift_requests').update({ status_new: knex.raw('status') });
  await knex.schema.alterTable('shift_requests', (table) => {
    table.dropColumn('status');
  });
  await knex.schema.alterTable('shift_requests', (table) => {
    table.renameColumn('status_new', 'status');
  });

  if (isMysql) {
    await knex.raw(`ALTER TABLE shift_requests MODIFY COLUMN status ENUM('pending','approved','denied','cancelled') NOT NULL DEFAULT 'pending'`);
  } else {
    await knex.raw(`ALTER TABLE shift_requests ALTER COLUMN status SET NOT NULL`);
    await knex.raw(`ALTER TABLE shift_requests ALTER COLUMN status SET DEFAULT 'pending'`);
    await knex.raw(`ALTER TABLE shift_requests ADD CONSTRAINT shift_requests_status_check CHECK (status IN ('pending','approved','denied','cancelled'))`);
  }
}

export async function down(knex: Knex): Promise<void> {
  const client = knex.client.config.client as string;
  const isMysql = client === 'mysql2' || client === 'mysql';

  // Trades cannot be represented in the narrower enum — caller must ensure
  // no 'trade' typed or 'cancelled' statused rows exist before rolling back.
  await knex.schema.alterTable('shift_requests', (table) => {
    table.string('status_old', 20).nullable();
  });
  await knex('shift_requests').update({ status_old: knex.raw('status') });
  await knex.schema.alterTable('shift_requests', (table) => {
    table.dropColumn('status');
  });
  await knex.schema.alterTable('shift_requests', (table) => {
    table.renameColumn('status_old', 'status');
  });
  if (isMysql) {
    await knex.raw(`ALTER TABLE shift_requests MODIFY COLUMN status ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending'`);
  } else {
    await knex.raw(`ALTER TABLE shift_requests ALTER COLUMN status SET NOT NULL`);
    await knex.raw(`ALTER TABLE shift_requests ALTER COLUMN status SET DEFAULT 'pending'`);
    await knex.raw(`ALTER TABLE shift_requests ADD CONSTRAINT shift_requests_status_check CHECK (status IN ('pending','approved','denied'))`);
  }

  await knex.schema.alterTable('shift_requests', (table) => {
    table.string('type_old', 20).nullable();
  });
  await knex('shift_requests').update({ type_old: knex.raw('type') });
  await knex.schema.alterTable('shift_requests', (table) => {
    table.dropColumn('type');
  });
  await knex.schema.alterTable('shift_requests', (table) => {
    table.renameColumn('type_old', 'type');
  });
  if (isMysql) {
    await knex.raw(`ALTER TABLE shift_requests MODIFY COLUMN type ENUM('time_off') NOT NULL`);
  } else {
    await knex.raw(`ALTER TABLE shift_requests ALTER COLUMN type SET NOT NULL`);
    await knex.raw(`ALTER TABLE shift_requests ADD CONSTRAINT shift_requests_type_check CHECK (type IN ('time_off'))`);
  }
}
