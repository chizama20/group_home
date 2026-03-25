import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Upsert dev organization
  let org = await knex('orgs').where({ name: 'Dev Home' }).first();
  if (!org) {
    const orgId = uuidv4();
    await knex('orgs').insert({ id: orgId, name: 'Dev Home' });
    org = { id: orgId };
  }

  // Skip if org_admin already exists for this org
  const existing = await knex('users').where({ email: 'admin@grouphome.com', org_id: org.id }).first();
  if (existing) return;

  const userId        = uuidv4();
  const password_hash = await bcrypt.hash('Admin@123', 12);

  await knex('users').insert({
    id:           userId,
    org_id:       org.id,
    email:        'admin@grouphome.com',
    password_hash,
    first_name:   'Admin',
    last_name:    'User',
    role:         'org_admin',
  });

  console.log('✓ Org admin created: admin@grouphome.com / Admin@123');
  console.log('  Org ID:', org.id, '— use this to log in');
}
