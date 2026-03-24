import { Knex } from 'knex';

const TABLES = ['residents', 'daily_logs', 'medications', 'medication_logs', 'incidents', 'shift_notes'];

export async function up(knex: Knex): Promise<void> {
  // 1. Add nullable organization_id to every tenant table
  for (const table of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.integer('organization_id').unsigned().nullable().after('id');
    });
  }

  // 2. Backfill from dev org
  const org = await knex('organizations').where({ slug: 'dev-home' }).first();
  if (org) {
    for (const table of TABLES) {
      await knex(table).update({ organization_id: org.id });
    }
  }

  // 3. Make NOT NULL, add FK + index on each table
  for (const table of TABLES) {
    await knex.raw(`ALTER TABLE \`${table}\` MODIFY COLUMN organization_id INT UNSIGNED NOT NULL`);
    await knex.raw(`ALTER TABLE \`${table}\` ADD CONSTRAINT fk_${table}_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE`);
    await knex.raw(`ALTER TABLE \`${table}\` ADD INDEX idx_${table}_org (organization_id)`);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of [...TABLES].reverse()) {
    await knex.raw(`ALTER TABLE \`${table}\` DROP FOREIGN KEY fk_${table}_org`);
    await knex.raw(`ALTER TABLE \`${table}\` DROP INDEX idx_${table}_org`);
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn('organization_id');
    });
  }
}
