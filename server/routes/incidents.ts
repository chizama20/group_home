import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { managerOrAbove } from '../middleware/rbac';
import { canAccessHome } from '../utils/homeAccess';

interface IdParam       { id: string; }
interface EscalateBody  { escalated_to: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── GET /incidents/:id — single incident (all roles) ──────────────────────
  fastify.get<{ Params: IdParam }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { org_id } = request.user;
      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT i.*, r.first_name as resident_first, r.last_name as resident_last,
                u.first_name as reporter_first, u.last_name as reporter_last
         FROM incidents i
         JOIN residents r ON i.resident_id = r.id
         JOIN homes h ON i.home_id = h.id
         JOIN users u ON i.reported_by = u.id
         WHERE i.id = ? AND h.org_id = ?`,
        [request.params.id, org_id]
      );
      if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Incident not found'));

      if (!await canAccessHome(fastify, request.user, rows[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Incident not found'));

      return reply.send(success(rows[0]));
    }
  );

  // ── PATCH /incidents/:id/sign-off — manager+ ──────────────────────────────
  fastify.patch<{ Params: IdParam }>(
    '/:id/sign-off',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { id: signed_off_by, org_id } = request.user;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT i.id, i.home_id, i.status FROM incidents i
         JOIN homes h ON i.home_id = h.id
         WHERE i.id = ? AND h.org_id = ?`,
        [request.params.id, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Incident not found'));

      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Incident not found'));

      await fastify.db.execute(
        `UPDATE incidents
         SET status = 'signed_off', signed_off_by = ?, signed_off_at = NOW()
         WHERE id = ?`,
        [signed_off_by, request.params.id]
      );
      return reply.send(success({ message: 'Incident signed off' }));
    }
  );

  // ── PATCH /incidents/:id/escalate — manager+ ──────────────────────────────
  fastify.patch<{ Params: IdParam; Body: EscalateBody }>(
    '/:id/escalate',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { escalated_to } = request.body;

      // escalated_to is optional — if omitted the incident is flagged but not assigned

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT i.id, i.home_id FROM incidents i
         JOIN homes h ON i.home_id = h.id
         WHERE i.id = ? AND h.org_id = ?`,
        [request.params.id, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Incident not found'));

      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Incident not found'));

      // Verify escalated_to is a user in the same org
      const [userCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND org_id = ?', [escalated_to, org_id]
      );
      if (!userCheck[0])
        return reply.code(404).send(failure('NOT_FOUND', 'Target user not found'));

      await fastify.db.execute(
        `UPDATE incidents SET status = 'escalated', escalated_to = ? WHERE id = ?`,
        [escalated_to ?? null, request.params.id]
      );
      return reply.send(success({ message: 'Incident escalated' }));
    }
  );
};
