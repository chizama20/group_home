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
interface IposLogBody {
  shift: string;
  goal_id?: string;
  task_id_code?: string;
  cls_minutes?: number;
  pc_minutes?: number;
  progress_code?: string;
  narrative?: string;
}
interface VitalsLogBody {
  vital_type: string;
  value_primary: number;
  value_secondary?: number;
  unit?: string;
  meal_timing?: string;
  notes?: string;
}
interface VitalsLogQuery {
  vital_type?: string;
  from?: string;
  to?: string;
}
interface DayProgramLogBody {
  program_name: string;
  program_address?: string;
  transport_staff?: string;
  transport_method?: string;
  departed_at?: string;
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

  // ── GET /residents/:id/medication-logs — MAR data for a date (all roles) ───
  fastify.get<{ Params: IdParam; Querystring: { date?: string } }>(
    '/:id/medication-logs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const date = request.query.date ?? new Date().toISOString().split('T')[0];

      // Return all active meds with their log for the requested date (if any)
      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT
           m.id            AS medication_id,
           m.name          AS med_name,
           m.dosage        AS med_dosage,
           m.frequency     AS med_frequency,
           m.scheduled_time,
           m.instructions,
           ml.id           AS log_id,
           ml.outcome,
           ml.notes        AS log_notes,
           ml.administered_at,
           ml.scheduled_date,
           u.first_name    AS admin_first,
           u.last_name     AS admin_last
         FROM medications m
         LEFT JOIN medication_logs ml
           ON ml.medication_id = m.id AND ml.scheduled_date = ?
         LEFT JOIN users u ON ml.administered_by = u.id
         WHERE m.resident_id = ? AND m.is_active = 1
         ORDER BY m.scheduled_time, m.name`,
        [date, request.params.id]
      );
      return reply.send(success(rows));
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

  // ── POST /residents/:id/ipos-logs — create or contribute to today's IPOS log
  fastify.post<{ Params: IdParam; Body: IposLogBody }>(
    '/:id/ipos-logs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { shift, goal_id, task_id_code, cls_minutes, pc_minutes, progress_code, narrative } = request.body;

      if (!shift)
        return reply.code(400).send(failure('MISSING_FIELDS', 'shift is required'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const today = new Date().toISOString().split('T')[0];

      const [existing] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM ipos_logs WHERE resident_id = ? AND log_date = ?',
        [request.params.id, today]
      );

      let log_id: string;
      if (existing[0]) {
        log_id = existing[0].id;
      } else {
        log_id = uuidv4();
        await fastify.db.execute(
          'INSERT INTO ipos_logs (id, resident_id, home_id, log_date, status) VALUES (?, ?, ?, ?, ?)',
          [log_id, request.params.id, resident[0].home_id, today, 'draft']
        );
      }

      const entry_id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO ipos_entries
         (id, log_id, user_id, shift, goal_id, task_id_code, cls_minutes, pc_minutes, progress_code, narrative)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry_id, log_id, request.user.id, shift,
         goal_id ?? null, task_id_code ?? null, cls_minutes ?? null,
         pc_minutes ?? null, progress_code ?? null, narrative ?? null]
      );
      return reply.code(201).send(success({ log_id, entry_id }));
    }
  );

  // ── GET /residents/:id/vitals — list vitals logs ──────────────────────────
  fastify.get<{ Params: IdParam; Querystring: VitalsLogQuery }>(
    '/:id/vitals',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const { vital_type, from, to } = request.query;
      const conditions: string[] = ['resident_id = ?'];
      const values: (string | number)[] = [request.params.id];

      if (vital_type) { conditions.push('vital_type = ?');          values.push(vital_type); }
      if (from)       { conditions.push('created_at >= ?');          values.push(from); }
      if (to)         { conditions.push('created_at <= ?');          values.push(to); }

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT * FROM vitals_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
        values
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /residents/:id/vitals — record a vital ───────────────────────────
  fastify.post<{ Params: IdParam; Body: VitalsLogBody }>(
    '/:id/vitals',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { vital_type, value_primary, value_secondary, unit, meal_timing, notes } = request.body;

      if (!vital_type || value_primary === undefined)
        return reply.code(400).send(failure('MISSING_FIELDS', 'vital_type and value_primary are required'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [config] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT target_min, target_max FROM resident_vitals_config WHERE resident_id = ? AND vital_type = ? AND is_active = 1',
        [request.params.id, vital_type]
      );

      let is_flagged = 0;
      if (config[0]) {
        const { target_min, target_max } = config[0];
        if (value_primary < target_min || value_primary > target_max) is_flagged = 1;
      }

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO vitals_logs
         (id, resident_id, home_id, recorded_by, vital_type, value_primary, value_secondary, unit, meal_timing, notes, is_flagged)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, request.params.id, resident[0].home_id, request.user.id,
         vital_type, value_primary, value_secondary ?? null,
         unit ?? null, meal_timing ?? null, notes ?? null, is_flagged]
      );
      return reply.code(201).send(success({ id, is_flagged }));
    }
  );

  // ── GET /residents/:id/day-program-logs — list day program logs ───────────
  fastify.get<{ Params: IdParam }>(
    '/:id/day-program-logs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT * FROM day_program_logs WHERE resident_id = ? ORDER BY departed_at DESC',
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /residents/:id/day-program-logs — log day program departure ──────
  fastify.post<{ Params: IdParam; Body: DayProgramLogBody }>(
    '/:id/day-program-logs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { program_name, program_address, transport_staff, transport_method, departed_at } = request.body;

      if (!program_name)
        return reply.code(400).send(failure('MISSING_FIELDS', 'program_name is required'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1', [request.params.id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const id = uuidv4();
      const departedAt = departed_at ?? new Date().toISOString();
      await fastify.db.execute(
        `INSERT INTO day_program_logs
         (id, resident_id, home_id, program_name, program_address, transport_staff, transport_method, departed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, request.params.id, resident[0].home_id, program_name,
         program_address ?? null, transport_staff ?? null, transport_method ?? null, departedAt]
      );
      return reply.code(201).send(success({ id }));
    }
  );
};
