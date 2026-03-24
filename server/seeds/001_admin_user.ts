import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Upsert dev organization
  let org = await knex('organizations').where({ slug: 'dev-home' }).first();
  if (!org) {
    const [insertId] = await knex('organizations').insert({ name: 'Dev Home', slug: 'dev-home' });
    org = { id: insertId };
  }

  // Skip if owner already exists for this org
  const existing = await knex('users').where({ email: 'owner@grouphome.com', organization_id: org.id }).first();
  if (existing) return;

  const password_hash = await bcrypt.hash('Owner@123', 12);

  await knex('users').insert({
    organization_id: org.id,
    name:            'Owner',
    email:           'owner@grouphome.com',
    password_hash,
    role:            'owner'
  });

  console.log('✓ Owner created: owner@grouphome.com / Owner@123 (org slug: dev-home)');
}
