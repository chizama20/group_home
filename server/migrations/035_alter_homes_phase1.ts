import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('homes', (table) => {
    table.integer('capacity').nullable()
    table.integer('min_staff_am').nullable()
    table.integer('min_staff_pm').nullable()
    table.integer('min_staff_mn').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('homes', (table) => {
    table.dropColumn('min_staff_mn')
    table.dropColumn('min_staff_pm')
    table.dropColumn('min_staff_am')
    table.dropColumn('capacity')
  })
}
