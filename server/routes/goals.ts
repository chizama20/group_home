import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';
import { adminOnly } from '../middleware/rbac';

interface IdParam { id: string; }
interface PatchBody {
  code?: string;
  description?: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // â”€â”€ PATCH /goals/:id â€” update goal (manager+) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: IdParam; Body: PatchBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const [goal] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, resident_id FROM resident_goals WHERE id = ? AND is_active = 1',
        [request.params.id]
      );
      if (!goal[0]) return reply.code(404).send(failure('NOT_FOUND', 'Goal not found'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1',
        [goal[0].resident_id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Goal not found'));

      const fields = ['code', 'description'] as const;

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
      await fastify.db.execute(
        `UPDATE resident_goals SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      return reply.send(success({ message: 'Goal updated' }));
    }
  );

  // â”€â”€ DELETE /goals/:id â€” soft delete goal (manager+) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.delete<{ Params: IdParam }>(
    '/:id',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const [goal] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, resident_id FROM resident_goals WHERE id = ? AND is_active = 1',
        [request.params.id]
      );
      if (!goal[0]) return reply.code(404).send(failure('NOT_FOUND', 'Goal not found'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1',
        [goal[0].resident_id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Goal not found'));

      await fastify.db.execute(
        'UPDATE resident_goals SET is_active = 0 WHERE id = ?',
        [request.params.id]
      );
      return reply.send(success({ message: 'Goal deactivated' }));
    }
  );
};
