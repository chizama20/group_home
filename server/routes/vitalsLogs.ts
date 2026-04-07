import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';

interface IdParam { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /vitals-logs/:id/acknowledge — acknowledge flagged vital ───────
  fastify.patch<{ Params: IdParam }>(
    '/:id/acknowledge',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [logs] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id, is_flagged FROM vitals_logs WHERE id = ?', [request.params.id]
      );
      if (!logs[0]) return reply.code(404).send(failure('NOT_FOUND', 'Log not found'));

      if (!logs[0].is_flagged)
        return reply.code(400).send(failure('NOT_FLAGGED', 'This vital log is not flagged'));

      if (!await canAccessHome(fastify, request.user, logs[0].home_id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      await fastify.db.execute(
        'UPDATE vitals_logs SET acknowledged_by = ?, acknowledged_at = NOW() WHERE id = ?',
        [request.user.id, request.params.id]
      );
      return reply.send(success({ message: 'Acknowledged' }));
    }
  );
};
