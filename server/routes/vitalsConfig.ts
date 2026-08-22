import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';
import { adminOnly } from '../middleware/rbac';

interface IdParam { id: string; }
interface PatchBody {
  vital_type?: string;
  label?: string;
  frequency?: string;
  meal_timing?: string;
  target_min?: number;
  target_max?: number;
  unit?: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // â”€â”€ PATCH /vitals-config/:id â€” update vitals config (manager+) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: IdParam; Body: PatchBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const [config] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, resident_id FROM resident_vitals_config WHERE id = ? AND is_active = 1',
        [request.params.id]
      );
      if (!config[0]) return reply.code(404).send(failure('NOT_FOUND', 'Vitals config not found'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1',
        [config[0].resident_id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Vitals config not found'));

      const fields = ['vital_type', 'label', 'frequency', 'meal_timing', 'target_min', 'target_max', 'unit'] as const;

      const updates: string[] = [];
      const values: (string | number | null)[] = [];
      for (const field of fields) {
        if (request.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push((request.body[field] as string | number | null) ?? null);
        }
      }

      if (updates.length === 0)
        return reply.code(400).send(failure('MISSING_FIELDS', 'At least one field is required'));

      values.push(request.params.id);
      await fastify.db.execute(
        `UPDATE resident_vitals_config SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      return reply.send(success({ message: 'Vitals config updated' }));
    }
  );

  // â”€â”€ DELETE /vitals-config/:id â€” soft delete vitals config (manager+) â”€â”€â”€â”€â”€
  fastify.delete<{ Params: IdParam }>(
    '/:id',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const [config] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, resident_id FROM resident_vitals_config WHERE id = ? AND is_active = 1',
        [request.params.id]
      );
      if (!config[0]) return reply.code(404).send(failure('NOT_FOUND', 'Vitals config not found'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1',
        [config[0].resident_id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Vitals config not found'));

      await fastify.db.execute(
        'UPDATE resident_vitals_config SET is_active = 0 WHERE id = ?',
        [request.params.id]
      );
      return reply.send(success({ message: 'Vitals config deactivated' }));
    }
  );
};
