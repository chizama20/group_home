import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';

interface IdParam { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /appointments/:id/complete — employee+ ──────────────────────────
  fastify.patch<{ Params: IdParam }>(
    '/:id/complete',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: completed_by } = request.user;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id, completed_at FROM appointments WHERE id = ?', [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Appointment not found'));

      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Appointment not found'));

      if (check[0].completed_at)
        return reply.code(409).send(failure('ALREADY_COMPLETE', 'Appointment is already completed'));

      await fastify.db.execute(
        'UPDATE appointments SET completed_by = ?, completed_at = NOW() WHERE id = ?',
        [completed_by, request.params.id]
      );
      return reply.send(success({ message: 'Appointment completed' }));
    }
  );
};
