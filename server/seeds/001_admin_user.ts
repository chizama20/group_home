import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex('users').where({ email: 'owner@grouphome.com' }).first();
  if (existing) return;

  const password_hash = await bcrypt.hash('Owner@123', 12);

  await knex('users').insert({
    name:          'Owner',
    email:         'owner@grouphome.com',
    password_hash,
    role:          'owner'
  });

  console.log('Owner account created: owner@grouphome.com / Owner@123');
}
