import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // ── Org ───────────────────────────────────────────────────────────────────
  let org = await knex('orgs').where({ name: 'Precious AFC Home, Inc.' }).first();
  if (!org) {
    const orgId = uuidv4();
    await knex('orgs').insert({ id: orgId, name: 'Precious AFC Home, Inc.' });
    org = { id: orgId };
  }

  // ── Skip if already seeded ────────────────────────────────────────────────
  const already = await knex('users').where({ email: 'admin@preciousafchome.com', org_id: org.id }).first();
  if (already) {
    console.log('Seed already applied — skipping');
    return;
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const staffHash  = await bcrypt.hash('Staff@123', 12);

  const adminId = uuidv4();
  const staffId  = uuidv4();

  await knex('users').insert([
    {
      id: adminId, org_id: org.id,
      email: 'admin@preciousafchome.com', password_hash: adminHash,
      first_name: 'Alex', last_name: 'Admin', role: 'admin',
    },
    {
      id: staffId, org_id: org.id,
      email: 'staff@preciousafchome.com', password_hash: staffHash,
      first_name: 'Sam', last_name: 'Staff', role: 'staff',
    },
  ]);

  // ── Homes ─────────────────────────────────────────────────────────────────
  const merritt    = uuidv4();
  const dixie      = uuidv4();
  const southfield = uuidv4();

  await knex('homes').insert([
    { id: merritt,    org_id: org.id, name: 'Merritt Home' },
    { id: dixie,      org_id: org.id, name: 'Dixie Home' },
    { id: southfield, org_id: org.id, name: 'Southfield Home' },
  ]);

  // Assign staff to Merritt Home
  await knex('home_staff').insert([
    { id: uuidv4(), home_id: merritt, user_id: staffId },
  ]);

  // ── Residents ─────────────────────────────────────────────────────────────
  const res1Id = uuidv4();
  const res2Id = uuidv4();

  await knex('residents').insert([
    {
      id: res1Id, home_id: merritt, created_by: adminId,
      first_name: 'Margaret', last_name: 'Johnson',
      date_of_birth: '1945-03-12',
      room: '1A',
      diagnosis: 'Dementia',
      primary_contact_name: 'Robert Johnson',
      primary_contact_phone: '0412 000 001',
      primary_contact_relation: 'Son',
    },
    {
      id: res2Id, home_id: merritt, created_by: adminId,
      first_name: 'Thomas', last_name: 'Harris',
      date_of_birth: '1938-07-22',
      room: '2B',
      diagnosis: 'Parkinson\'s Disease',
      primary_contact_name: 'Susan Harris',
      primary_contact_phone: '0412 000 002',
      primary_contact_relation: 'Daughter',
    },
  ]);

  // ── Tracked Behaviors ─────────────────────────────────────────────────────
  await knex('tracked_behaviors').insert([
    { id: uuidv4(), resident_id: res1Id, name: 'Wandering' },
    { id: uuidv4(), resident_id: res1Id, name: 'Verbal Aggression' },
    { id: uuidv4(), resident_id: res2Id, name: 'Tremor Episodes' },
  ]);

  // ── Medications (static reference info only) ─────────────────────────────
  await knex('medications').insert([
    {
      id: uuidv4(), resident_id: res1Id,
      name: 'Donepezil', dosage: '10mg', frequency: 'Once daily',
      scheduled_time: '08:00', prescriber: 'Dr. Smith',
    },
    {
      id: uuidv4(), resident_id: res1Id,
      name: 'Lorazepam', dosage: '0.5mg', frequency: 'As needed',
      prescriber: 'Dr. Smith',
    },
    {
      id: uuidv4(), resident_id: res2Id,
      name: 'Levodopa', dosage: '100mg', frequency: 'Three times daily',
      scheduled_time: '08:00', prescriber: 'Dr. Patel',
    },
    {
      id: uuidv4(), resident_id: res2Id,
      name: 'Ropinirole', dosage: '2mg', frequency: 'Twice daily',
      scheduled_time: '14:00', prescriber: 'Dr. Patel',
    },
  ]);

  console.log('\n✓ Seed complete — Precious AFC Home, Inc.\n');
  console.log('  Test accounts:');
  console.log('  Admin  →  admin@preciousafchome.com / Admin@123');
  console.log('  Staff  →  staff@preciousafchome.com / Staff@123\n');
}
