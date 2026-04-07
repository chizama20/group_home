import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';
import { orgAdminOnly, managerOrAbove } from '../middleware/rbac';

interface IdParam    { id: string; }
interface BIdParam   { id: string; bId: string; }
interface PatchBody {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  room?: string;
  diagnosis?: string;
  physician?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_relation?: string;
  notes?: string;
}
interface BehaviorBody { name: string; description?: string; }
interface MedicationBody {
  name: string;
  dosage: string;
  frequency: string;
  scheduled_time?: string;
  instructions?: string;
  prescriber?: string;
}
interface ContactBody {
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  is_emergency_contact?: boolean;
  notify_on_incident?: boolean;
}
interface GoalBody {
  goal_type: 'cls' | 'pc';
  code: string;
  description?: string;
}
interface VitalsConfigBody {
  vital_type: string;
  label?: string;
  frequency?: string;
  meal_timing?: string;
  target_min?: number;
  target_max?: number;
  unit?: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── GET /residents/:id — single resident profile (all roles) ──────────────
  fastify.get<{ Params: IdParam }>('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT * FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
    );
    if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

    if (!await canAccessHome(fastify, request.user, rows[0].home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

    return reply.send(success(rows[0]));
  });

  // ── PATCH /residents/:id — edit profile fields (manager+) ───────────────
  fastify.patch<{ Params: IdParam; Body: PatchBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, rows[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const fields = [
        'first_name', 'last_name', 'date_of_birth', 'room', 'diagnosis', 'physician',
        'primary_contact_name', 'primary_contact_phone', 'primary_contact_relation', 'notes'
      ] as const;

      const updates: string[] = [];
      const values: (string | null)[] = [];
      for (const field of fields) {
        if (request.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(request.body[field] ?? null);
        }
      }

      if (updates.length === 0)
        return reply.code(400).send(failure('MISSING_FIELDS', 'At least one field is required'));

      values.push(request.params.id);
      await fastify.db.execute(`UPDATE residents SET ${updates.join(', ')} WHERE id = ?`, values);

      return reply.send(success({ message: 'Resident updated' }));
    }
  );

  // ── PATCH /residents/:id/archive — set is_active=0 (org_admin only) ───────
  fastify.patch<{ Params: IdParam }>(
    '/:id/archive',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ?', [request.params.id]
      );
      if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, rows[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      await fastify.db.execute('UPDATE residents SET is_active = 0 WHERE id = ?', [request.params.id]);
      return reply.send(success({ message: 'Resident archived' }));
    }
  );

  // ── GET /residents/:id/behaviors — list tracked behaviors (all roles) ──────
  fastify.get<{ Params: IdParam }>(
    '/:id/behaviors',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT * FROM tracked_behaviors WHERE resident_id = ? AND is_active = 1 ORDER BY name',
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /residents/:id/behaviors — add tracked behavior (manager+) ────────
  fastify.post<{ Params: IdParam; Body: BehaviorBody }>(
    '/:id/behaviors',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { name, description } = request.body;

      if (!name)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name is required'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO tracked_behaviors (id, resident_id, name, description) VALUES (?, ?, ?, ?)',
        [id, request.params.id, name, description ?? null]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ── DELETE /residents/:id/behaviors/:bId — delete tracked behavior (manager+)
  fastify.delete<{ Params: BIdParam }>(
    '/:id/behaviors/:bId',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [bCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM tracked_behaviors WHERE id = ? AND resident_id = ?',
        [request.params.bId, request.params.id]
      );
      if (!bCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Behavior not found'));

      await fastify.db.execute('DELETE FROM tracked_behaviors WHERE id = ?', [request.params.bId]);
      return reply.send(success({ message: 'Behavior deleted' }));
    }
  );

  // ── GET /residents/:id/medications — all meds for resident (all roles) ─────
  fastify.get<{ Params: IdParam }>(
    '/:id/medications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT * FROM medications WHERE resident_id = ? AND is_active = 1 ORDER BY scheduled_time',
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /residents/:id/medications — add medication (manager+) ────────────
  fastify.post<{ Params: IdParam; Body: MedicationBody }>(
    '/:id/medications',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { id: created_by } = request.user;
      const { name, dosage, frequency, scheduled_time, instructions, prescriber } = request.body;

      if (!name || !dosage || !frequency)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name, dosage, and frequency are required'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO medications
         (id, resident_id, name, dosage, frequency, scheduled_time, instructions, prescriber, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, request.params.id, name, dosage, frequency,
         scheduled_time ?? null, instructions ?? null, prescriber ?? null, created_by]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ── GET /residents/:id/ipos — IPOS history (all roles) ────────────────────
  fastify.get<{ Params: IdParam }>(
    '/:id/ipos',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT il.*, u.first_name as staff_first, u.last_name as staff_last
         FROM ipos_logs il
         JOIN users u ON il.user_id = u.id
         WHERE il.resident_id = ?
         ORDER BY il.log_date DESC, il.shift`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── GET /residents/:id/appointments — all appointments (all roles) ─────────
  fastify.get<{ Params: IdParam }>(
    '/:id/appointments',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT a.*, u.first_name as scheduled_by_first, u.last_name as scheduled_by_last
         FROM appointments a
         JOIN users u ON a.scheduled_by = u.id
         WHERE a.resident_id = ?
         ORDER BY a.appointment_date DESC, a.appointment_time`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── GET /residents/:id/behavioral-logs — behavioral log history (all roles) ─
  fastify.get<{ Params: IdParam }>(
    '/:id/behavioral-logs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT bl.*, tb.name as behavior_name, u.first_name as staff_first, u.last_name as staff_last
         FROM behavioral_logs bl
         JOIN tracked_behaviors tb ON bl.behavior_id = tb.id
         JOIN users u ON bl.user_id = u.id
         WHERE bl.resident_id = ?
         ORDER BY bl.occurred_at DESC`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /residents/:id/discharge — discharge resident (org_admin only) ──
  fastify.post<{ Params: IdParam }>(
    '/:id/discharge',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, rows[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      await fastify.db.execute(
        'UPDATE residents SET is_active = 0, discharge_date = NOW(), discharged_by = ? WHERE id = ?',
        [request.user.id, request.params.id]
      );
      return reply.send(success({ message: 'Resident discharged' }));
    }
  );

  // ── GET /residents/:id/contacts — list contacts (all roles) ──────────────
  fastify.get<{ Params: IdParam }>(
    '/:id/contacts',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT * FROM resident_contacts WHERE resident_id = ? AND is_active = 1 ORDER BY name',
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /residents/:id/contacts — add contact (manager+) ────────────────
  fastify.post<{ Params: IdParam; Body: ContactBody }>(
    '/:id/contacts',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { name, relationship, phone, email, is_emergency_contact, notify_on_incident } = request.body;

      if (!name)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name is required'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO resident_contacts
         (id, resident_id, name, relationship, phone, email, is_emergency_contact, notify_on_incident)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, request.params.id, name, relationship ?? null, phone ?? null, email ?? null,
         is_emergency_contact ? 1 : 0, notify_on_incident ? 1 : 0]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ── GET /residents/:id/goals — list goals (all roles) ────────────────────
  fastify.get<{ Params: IdParam }>(
    '/:id/goals',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT * FROM resident_goals WHERE resident_id = ? AND is_active = 1 ORDER BY goal_type, code',
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /residents/:id/goals — add goal (manager+) ──────────────────────
  fastify.post<{ Params: IdParam; Body: GoalBody }>(
    '/:id/goals',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { goal_type, code, description } = request.body;

      if (!goal_type || !code)
        return reply.code(400).send(failure('MISSING_FIELDS', 'goal_type and code are required'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO resident_goals (id, resident_id, goal_type, code, description) VALUES (?, ?, ?, ?, ?)',
        [id, request.params.id, goal_type, code, description ?? null]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ── GET /residents/:id/vitals-config — list vitals config (all roles) ────
  fastify.get<{ Params: IdParam }>(
    '/:id/vitals-config',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT * FROM resident_vitals_config WHERE resident_id = ? AND is_active = 1 ORDER BY vital_type',
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /residents/:id/vitals-config — add vitals config (manager+) ─────
  fastify.post<{ Params: IdParam; Body: VitalsConfigBody }>(
    '/:id/vitals-config',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { vital_type, label, frequency, meal_timing, target_min, target_max, unit } = request.body;

      if (!vital_type)
        return reply.code(400).send(failure('MISSING_FIELDS', 'vital_type is required'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO resident_vitals_config
         (id, resident_id, vital_type, label, frequency, meal_timing, target_min, target_max, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, request.params.id, vital_type, label ?? null, frequency ?? null,
         meal_timing ?? null, target_min ?? null, target_max ?? null, unit ?? null]
      );
      return reply.code(201).send(success({ id }));
    }
  );
};
