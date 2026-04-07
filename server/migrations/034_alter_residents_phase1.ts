import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('residents', (table) => {
    table.string('gender', 20).nullable()
    table.string('medicaid_id', 100).nullable()
    table.date('admit_date').nullable()
    table.boolean('hab_waiver').defaultTo(false)
    table.text('loa_info').nullable()
    table.integer('sleep_hours').nullable()
    table.boolean('attends_day_program').defaultTo(false)
    table.integer('day_program_days_per_week').nullable()
    table.date('discharge_date').nullable()
    table.uuid('discharged_by').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('residents', (table) => {
    table.dropColumn('discharged_by')
    table.dropColumn('discharge_date')
    table.dropColumn('day_program_days_per_week')
    table.dropColumn('attends_day_program')
    table.dropColumn('sleep_hours')
    table.dropColumn('loa_info')
    table.dropColumn('hab_waiver')
    table.dropColumn('admit_date')
    table.dropColumn('medicaid_id')
    table.dropColumn('gender')
  })
}
