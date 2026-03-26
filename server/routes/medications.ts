import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';
import { managerOrAbove } from '../middleware/rbac';

interface MedIdParam     { id: string; }
interface PatchBody {
  name?: string;
  dosage?: string;
  frequency?: string;
  scheduled_time?: string;
  instructions?: string;
  prescriber?: string;
}
interface AdministerBody { outcome: 'given' | 'refused' | 'missed' | 'held'; notes?: string; }
interface BulkAdminBody  { medication_ids: string[]; outcome: 'given' | 'refused' | 'missed' | 'held'; notes?: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /medications/:id — edit medication fields (manager+) ─────────────
  fastify.patch<{ Params: MedIdParam; Body: PatchBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const [check] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT m.id, r.home_id FROM medications m
         JOIN residents r ON m.resident_id = r.id
         WHERE m.id = ? AND m.is_active = 1`,
        [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Medication not found'));

      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Medication not found'));

      const fields = ['name', 'dosage', 'frequency', 'scheduled_time', 'instructions', 'prescriber'] as const;
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
      await fastify.db.execute(`UPDATE medications SET ${updates.join(', ')} WHERE id = ?`, values);

      return reply.send(success({ message: 'Medication updated' }));
    }
  );

  // ── DELETE /medications/:id — soft delete (manager+) ─────────────────────
  fastify.delete<{ Params: MedIdParam }>(
    '/:id',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const [check] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT m.id, r.home_id FROM medications m
         JOIN residents r ON m.resident_id = r.id
         WHERE m.id = ?`,
        [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Medication not found'));

      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Medication not found'));

      await fastify.db.execute('UPDATE medications SET is_active = 0 WHERE id = ?', [request.params.id]);
      return reply.send(success({ message: 'Medication archived' }));
    }
  );

  // ── POST /medications/:id/administer — log administration (employee+) ──────
  // LEGAL RECORD: administered_at is always server-stamped (never from client).
  // Server enforces NOW() >= scheduled_time before logging.
  fastify.post<{ Params: MedIdParam; Body: AdministerBody }>(
    '/:id/administer',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: administered_by } = request.user;
      const { outcome, notes } = request.body;

      if (!outcome)
        return reply.code(400).send(failure('MISSING_FIELDS', 'outcome is required'));

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT m.id, m.resident_id, m.scheduled_time, r.home_id
         FROM medications m
         JOIN residents r ON m.resident_id = r.id
         WHERE m.id = ? AND m.is_active = 1`,
        [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Medication not found'));

      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Medication not found'));

      // Enforce: server time must be >= scheduled_time
      if (check[0].scheduled_time) {
        const [timeCheck] = await fastify.db.execute<RowDataPacket[]>(
          'SELECT TIME(NOW()) >= ? AS ready', [check[0].scheduled_time]
        );
        if (!timeCheck[0]?.ready) {
          return reply.code(422).send(failure(
            'TOO_EARLY',
            `This medication is not due until ${check[0].scheduled_time}`
          ));
        }
      }

      const id = uuidv4();
      // administered_at defaults to NOW() in the DB — never accept from client
      await fastify.db.execute(
        'INSERT INTO medication_logs (id, medication_id, resident_id, administered_by, outcome, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, request.params.id, check[0].resident_id, administered_by, outcome, notes ?? null]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ── POST /medications/bulk-administer — log multiple meds (employee+) ──────
  // Same server-side checks applied to each medication.
  fastify.post<{ Body: BulkAdminBody }>(
    '/bulk-administer',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: administered_by } = request.user;
      const { medication_ids, outcome, notes } = request.body;

      if (!medication_ids || !Array.isArray(medication_ids) || medication_ids.length === 0)
        return reply.code(400).send(failure('MISSING_FIELDS', 'medication_ids array is required'));

      if (!outcome)
        return reply.code(400).send(failure('MISSING_FIELDS', 'outcome is required'));

      const results: { id: string; medication_id: string; status: string; error?: string }[] = [];

      for (const medId of medication_ids) {
        const [check] = await fastify.db.execute<RowDataPacket[]>(
          `SELECT m.id, m.resident_id, m.scheduled_time, r.home_id
           FROM medications m
           JOIN residents r ON m.resident_id = r.id
           WHERE m.id = ? AND m.is_active = 1`,
          [medId]
        );

        if (!check[0]) {
          results.push({ id: uuidv4(), medication_id: medId, status: 'error', error: 'Medication not found' });
          continue;
        }

        if (!await canAccessHome(fastify, request.user, check[0].home_id)) {
          results.push({ id: uuidv4(), medication_id: medId, status: 'error', error: 'Access denied' });
          continue;
        }

        if (check[0].scheduled_time) {
          const [timeCheck] = await fastify.db.execute<RowDataPacket[]>(
            'SELECT TIME(NOW()) >= ? AS ready', [check[0].scheduled_time]
          );
          if (!timeCheck[0]?.ready) {
            results.push({ id: uuidv4(), medication_id: medId, status: 'error', error: `Not due until ${check[0].scheduled_time}` });
            continue;
          }
        }

        const logId = uuidv4();
        await fastify.db.execute(
          'INSERT INTO medication_logs (id, medication_id, resident_id, administered_by, outcome, notes) VALUES (?, ?, ?, ?, ?, ?)',
          [logId, medId, check[0].resident_id, administered_by, outcome, notes ?? null]
        );
        results.push({ id: logId, medication_id: medId, status: 'ok' });
      }

      return reply.code(201).send(success({ results }));
    }
  );
};
