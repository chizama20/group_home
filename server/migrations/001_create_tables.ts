import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('email').notNullable().unique();
    t.string('password_hash').notNullable();
    t.enum('role', ['admin', 'staff']).notNullable().defaultTo('staff');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('residents', (t) => {
    t.increments('id').primary();
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.date('date_of_birth').notNullable();
    t.string('room_number').nullable();
    t.text('notes').nullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('daily_logs', (t) => {
    t.increments('id').primary();
    t.integer('resident_id').unsigned().notNullable().references('id').inTable('residents').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enum('mood', ['great', 'good', 'neutral', 'upset', 'crisis']).notNullable();
    t.enum('behavior', ['calm', 'agitated', 'aggressive', 'withdrawn', 'other']).notNullable();
    t.text('notes').nullable();
    t.timestamp('logged_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('medications', (t) => {
    t.increments('id').primary();
    t.integer('resident_id').unsigned().notNullable().references('id').inTable('residents').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('dosage').notNullable();
    t.enum('frequency', ['daily', 'twice_daily', 'three_times_daily', 'as_needed', 'weekly']).notNullable();
    t.text('instructions').nullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('medication_logs', (t) => {
    t.increments('id').primary();
    t.integer('medication_id').unsigned().notNullable().references('id').inTable('medications').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enum('status', ['given', 'refused', 'missed']).notNullable();
    t.text('notes').nullable();
    t.timestamp('administered_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('incidents', (t) => {
    t.increments('id').primary();
    t.integer('resident_id').unsigned().notNullable().references('id').inTable('residents').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
    t.enum('type', ['behavioral', 'medical', 'property', 'safety', 'other']).notNullable();
    t.text('description').notNullable();
    t.text('action_taken').nullable();
    t.boolean('reported_to_supervisor').notNullable().defaultTo(false);
    t.timestamp('occurred_at').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('shift_notes', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enum('shift', ['morning', 'afternoon', 'overnight']).notNullable();
    t.text('content').notNullable();
    t.boolean('flagged').notNullable().defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('shift_notes');
  await knex.schema.dropTableIfExists('incidents');
  await knex.schema.dropTableIfExists('medication_logs');
  await knex.schema.dropTableIfExists('medications');
  await knex.schema.dropTableIfExists('daily_logs');
  await knex.schema.dropTableIfExists('residents');
  await knex.schema.dropTableIfExists('users');
}
