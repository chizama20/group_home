import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';
import { managerOrAbove } from '../middleware/rbac';

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

  // ── PATCH /residents/:id — edit profile fields (manager+) ─────────────────
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

  // ── PATCH /residents/:id/archive — set is_active=0 (manager+) ─────────────
  fastify.patch<{ Params: IdParam }>(
    '/:id/archive',
    { preHandler: [fastify.authenticate, managerOrAbove] },
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
};
