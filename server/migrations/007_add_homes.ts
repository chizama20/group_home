import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── homes table ────────────────────────────────────────────────────────
  await knex.schema.createTable('homes', (t) => {
    t.increments('id').primary();
    t.integer('organization_id').unsigned().notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('address').nullable();
    t.string('phone').nullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('organization_id');
  });

  // ── user_homes junction (users ↔ homes, many-to-many) ──────────────────
  await knex.schema.createTable('user_homes', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.integer('home_id').unsigned().notNullable()
      .references('id').inTable('homes').onDelete('CASCADE');
    t.unique(['user_id', 'home_id']);
  });

  // ── add home_id to residents ───────────────────────────────────────────
  await knex.schema.alterTable('residents', (t) => {
    t.integer('home_id').unsigned().nullable().after('organization_id');
  });

  // ── add home_id to shift_notes ─────────────────────────────────────────
  await knex.schema.alterTable('shift_notes', (t) => {
    t.integer('home_id').unsigned().nullable().after('organization_id');
  });

  // ── create a default home per existing org, backfill residents ─────────
  const orgs = await knex('organizations').select('id', 'name');
  for (const org of orgs) {
    const [homeId] = await knex('homes').insert({
      organization_id: org.id,
      name: `${org.name} — Main Home`
    });
    await knex('residents').where({ organization_id: org.id }).update({ home_id: homeId });
    await knex('shift_notes').where({ organization_id: org.id }).update({ home_id: homeId });
  }

  // ── make home_id NOT NULL now that it's backfilled ─────────────────────
  await knex.raw('ALTER TABLE residents   MODIFY COLUMN home_id INT UNSIGNED NOT NULL');
  await knex.raw('ALTER TABLE shift_notes MODIFY COLUMN home_id INT UNSIGNED NOT NULL');

  // ── add FKs ────────────────────────────────────────────────────────────
  await knex.raw('ALTER TABLE residents   ADD CONSTRAINT fk_residents_home   FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE RESTRICT');
  await knex.raw('ALTER TABLE shift_notes ADD CONSTRAINT fk_shift_notes_home FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE RESTRICT');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE shift_notes DROP FOREIGN KEY fk_shift_notes_home');
  await knex.raw('ALTER TABLE residents   DROP FOREIGN KEY fk_residents_home');
  await knex.schema.alterTable('shift_notes', t => t.dropColumn('home_id'));
  await knex.schema.alterTable('residents',   t => t.dropColumn('home_id'));
  await knex.schema.dropTableIfExists('user_homes');
  await knex.schema.dropTableIfExists('homes');
}
