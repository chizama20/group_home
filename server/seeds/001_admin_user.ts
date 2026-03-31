import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // ── Org ───────────────────────────────────────────────────────────────────
  let org = await knex('orgs').where({ name: 'Sunrise Care Group' }).first();
  if (!org) {
    const orgId = uuidv4();
    await knex('orgs').insert({ id: orgId, name: 'Sunrise Care Group' });
    org = { id: orgId };
  }

  // ── Skip if already seeded ────────────────────────────────────────────────
  const already = await knex('users').where({ email: 'admin@sunrise.com', org_id: org.id }).first();
  if (already) {
    console.log('Seed already applied — skipping');
    return;
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminHash    = await bcrypt.hash('Admin@123',    12);
  const managerHash  = await bcrypt.hash('Manager@123',  12);
  const employeeHash = await bcrypt.hash('Employee@123', 12);

  const adminId    = uuidv4();
  const managerId  = uuidv4();
  const employeeId = uuidv4();

  await knex('users').insert([
    {
      id: adminId, org_id: org.id,
      email: 'admin@sunrise.com', password_hash: adminHash,
      first_name: 'Alex', last_name: 'Admin', role: 'org_admin',
    },
    {
      id: managerId, org_id: org.id,
      email: 'manager@sunrise.com', password_hash: managerHash,
      first_name: 'Maya', last_name: 'Manager', role: 'manager',
    },
    {
      id: employeeId, org_id: org.id,
      email: 'employee@sunrise.com', password_hash: employeeHash,
      first_name: 'Eddie', last_name: 'Employee', role: 'employee',
    },
  ]);

  // ── Home ──────────────────────────────────────────────────────────────────
  const homeId = uuidv4();
  await knex('homes').insert({
    id: homeId, org_id: org.id,
    name: 'Sunrise House',
    address: '12 Sunrise Lane',
  });

  // Assign manager and employee to the home
  await knex('home_staff').insert([
    { id: uuidv4(), home_id: homeId, user_id: managerId },
    { id: uuidv4(), home_id: homeId, user_id: employeeId },
  ]);

  // ── Residents ─────────────────────────────────────────────────────────────
  const res1Id = uuidv4();
  const res2Id = uuidv4();

  await knex('residents').insert([
    {
      id: res1Id, home_id: homeId, created_by: adminId,
      first_name: 'Margaret', last_name: 'Johnson',
      date_of_birth: '1945-03-12',
      room: '1A',
      diagnosis: 'Dementia',
      primary_contact_name: 'Robert Johnson',
      primary_contact_phone: '0412 000 001',
      primary_contact_relation: 'Son',
    },
    {
      id: res2Id, home_id: homeId, created_by: adminId,
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

  // ── Medications ───────────────────────────────────────────────────────────
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

  console.log('\n✓ Seed complete — Sunrise Care Group\n');
  console.log('  Test accounts:');
  console.log('  Org Admin  →  admin@sunrise.com    / Admin@123');
  console.log('  Manager    →  manager@sunrise.com  / Manager@123');
  console.log('  Employee   →  employee@sunrise.com / Employee@123\n');
}
