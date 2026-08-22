import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';
import { adminOnly } from '../middleware/rbac';

interface MedIdParam     { id: string; }
interface PatchBody {
  name?: string;
  dosage?: string;
  frequency?: string;
  scheduled_time?: string;
  instructions?: string;
  prescriber?: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /medications/:id — edit medication fields (admin) ──────────────
  fastify.patch<{ Params: MedIdParam; Body: PatchBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, adminOnly] },
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

  // ── DELETE /medications/:id — soft delete (admin) ─────────────────────────
  fastify.delete<{ Params: MedIdParam }>(
    '/:id',
    { preHandler: [fastify.authenticate, adminOnly] },
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
};
