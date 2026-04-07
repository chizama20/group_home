import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';

interface IdParam { id: string; }

interface ReturnBody {
  returned_at?: string;
  return_notes?: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /day-program-logs/:id/return — log resident return ────────────
  fastify.patch<{ Params: IdParam; Body: ReturnBody }>(
    '/:id/return',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [logs] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM day_program_logs WHERE id = ?', [request.params.id]
      );
      if (!logs[0]) return reply.code(404).send(failure('NOT_FOUND', 'Log not found'));

      if (!await canAccessHome(fastify, request.user, logs[0].home_id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const returned_at = request.body.returned_at ?? new Date().toISOString();
      const return_notes = request.body.return_notes ?? null;

      await fastify.db.execute(
        'UPDATE day_program_logs SET returned_at = ?, return_notes = ? WHERE id = ?',
        [returned_at, return_notes, request.params.id]
      );
      return reply.send(success({ message: 'Return logged' }));
    }
  );
};
