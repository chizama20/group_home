import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { managerOrAbove } from '../middleware/rbac';
import { canAccessHome } from '../utils/homeAccess';

interface IdParam { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /tasks/:id/claim — set claimed_by + claimed_at (employee+) ──────
  fastify.patch<{ Params: IdParam }>(
    '/:id/claim',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: claimed_by } = request.user;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id, claimed_by FROM tasks WHERE id = ?', [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Task not found'));

      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Task not found'));

      if (check[0].claimed_by)
        return reply.code(409).send(failure('ALREADY_CLAIMED', 'Task is already claimed'));

      await fastify.db.execute(
        'UPDATE tasks SET claimed_by = ?, claimed_at = NOW() WHERE id = ?',
        [claimed_by, request.params.id]
      );
      return reply.send(success({ message: 'Task claimed' }));
    }
  );

  // ── PATCH /tasks/:id/complete — set completed_at (employee+) ──────────────
  fastify.patch<{ Params: IdParam }>(
    '/:id/complete',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id, completed_at FROM tasks WHERE id = ?', [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Task not found'));

      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Task not found'));

      if (check[0].completed_at)
        return reply.code(409).send(failure('ALREADY_COMPLETE', 'Task is already completed'));

      await fastify.db.execute(
        'UPDATE tasks SET completed_at = NOW() WHERE id = ?', [request.params.id]
      );
      return reply.send(success({ message: 'Task completed' }));
    }
  );

  // ── DELETE /tasks/:id — remove task (manager+) ────────────────────────────
  fastify.delete<{ Params: IdParam }>(
    '/:id',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM tasks WHERE id = ?', [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Task not found'));

      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Task not found'));

      await fastify.db.execute('DELETE FROM tasks WHERE id = ?', [request.params.id]);
      return reply.send(success({ message: 'Task deleted' }));
    }
  );
};
