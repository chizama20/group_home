import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../../utils/response';

interface IdParam { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── GET /admin/orgs ───────────────────────────────────────────────────────
  fastify.get('/', { preHandler: [fastify.adminAuthenticate] }, async (_request, reply) => {
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT id, name, facility_type, status, baa_signed_at, created_at
       FROM orgs
       ORDER BY created_at DESC`
    );
    return reply.send(success(rows));
  });

  // ── POST /admin/orgs/:id/suspend ─────────────────────────────────────────
  fastify.post<{ Params: IdParam }>('/:id/suspend', { preHandler: [fastify.adminAuthenticate] }, async (request, reply) => {
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      "SELECT id, status FROM orgs WHERE id = ?",
      [request.params.id]
    );
    const org = rows[0];
    if (!org) return reply.code(404).send(failure('NOT_FOUND', 'Org not found'));
    if (org.status === 'suspended')
      return reply.code(409).send(failure('ALREADY_SUSPENDED', 'Org is already suspended'));

    await fastify.db.execute(
      "UPDATE orgs SET status = 'suspended' WHERE id = ?",
      [request.params.id]
    );
    return reply.send(success({ message: 'Org suspended' }));
  });

  // ── POST /admin/orgs/:id/reactivate ──────────────────────────────────────
  fastify.post<{ Params: IdParam }>('/:id/reactivate', { preHandler: [fastify.adminAuthenticate] }, async (request, reply) => {
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      "SELECT id, status FROM orgs WHERE id = ?",
      [request.params.id]
    );
    const org = rows[0];
    if (!org) return reply.code(404).send(failure('NOT_FOUND', 'Org not found'));
    if (org.status === 'active')
      return reply.code(409).send(failure('ALREADY_ACTIVE', 'Org is already active'));

    await fastify.db.execute(
      "UPDATE orgs SET status = 'active' WHERE id = ?",
      [request.params.id]
    );
    return reply.send(success({ message: 'Org reactivated' }));
  });
};
