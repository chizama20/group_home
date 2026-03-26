import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `ALTER TABLE medication_logs MODIFY COLUMN outcome ENUM('given','partial','refused','missed','held') NOT NULL`
  )
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    `ALTER TABLE medication_logs MODIFY COLUMN outcome ENUM('given','refused','missed','held') NOT NULL`
  )
}
