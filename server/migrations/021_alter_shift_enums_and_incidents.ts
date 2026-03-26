import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Rename shift values across all three tables: morning→day, afternoon→evening, overnight→night
  await knex.raw(`ALTER TABLE ipos_logs    MODIFY COLUMN shift ENUM('day','evening','night') NOT NULL`)
  await knex.raw(`ALTER TABLE shift_notes  MODIFY COLUMN shift ENUM('day','evening','night') NOT NULL`)
  await knex.raw(`ALTER TABLE shift_roster MODIFY COLUMN shift ENUM('day','evening','night') NOT NULL`)

  // Add incident detail columns
  await knex.schema.alterTable('incidents', (table) => {
    table.string('incident_type', 100).nullable()
    table.enum('severity', ['low', 'medium', 'high']).nullable()
    table.datetime('occurred_at').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE ipos_logs    MODIFY COLUMN shift ENUM('morning','afternoon','overnight') NOT NULL`)
  await knex.raw(`ALTER TABLE shift_notes  MODIFY COLUMN shift ENUM('morning','afternoon','overnight') NOT NULL`)
  await knex.raw(`ALTER TABLE shift_roster MODIFY COLUMN shift ENUM('morning','afternoon','overnight') NOT NULL`)

  await knex.schema.alterTable('incidents', (table) => {
    table.dropColumn('incident_type')
    table.dropColumn('severity')
    table.dropColumn('occurred_at')
  })
}
