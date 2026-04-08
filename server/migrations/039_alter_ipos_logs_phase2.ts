import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Step 1: Drop the old unique index. No FK references it in the current DB state.
  await knex.schema.alterTable('ipos_logs', (table) => {
    table.dropUnique(['resident_id', 'shift', 'log_date'])
  })

  // Step 2: Drop obsolete columns (MySQL auto-drops their covering indexes).
  await knex.schema.alterTable('ipos_logs', (table) => {
    table.dropColumn('user_id')
    table.dropColumn('shift')
    table.dropColumn('content')
  })

  // Step 3: Add new columns only if missing (guards against partial prior runs).
  const [hasStatus, hasSubmittedAt, hasApprovedBy, hasApprovedAt] = await Promise.all([
    knex.schema.hasColumn('ipos_logs', 'status'),
    knex.schema.hasColumn('ipos_logs', 'submitted_at'),
    knex.schema.hasColumn('ipos_logs', 'approved_by'),
    knex.schema.hasColumn('ipos_logs', 'approved_at'),
  ])

  await knex.schema.alterTable('ipos_logs', (table) => {
    if (!hasStatus)      table.string('status', 20).notNullable().defaultTo('draft')
    if (!hasSubmittedAt) table.datetime('submitted_at').nullable()
    if (!hasApprovedBy)  table.uuid('approved_by').nullable()
    if (!hasApprovedAt)  table.datetime('approved_at').nullable()
    table.unique(['resident_id', 'log_date'])
    table.foreign('resident_id').references('id').inTable('residents')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ipos_logs', (table) => {
    table.dropForeign(['resident_id'])
    table.dropUnique(['resident_id', 'log_date'])
  })

  await knex.schema.alterTable('ipos_logs', (table) => {
    table.dropColumn('approved_at')
    table.dropColumn('approved_by')
    table.dropColumn('submitted_at')
    table.dropColumn('status')
    table.uuid('user_id').notNullable().references('id').inTable('users')
    table.string('shift', 20).notNullable()
    table.text('content').notNullable()
    table.unique(['resident_id', 'shift', 'log_date'])
    table.foreign('resident_id').references('id').inTable('residents')
  })
}
