import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { adminOnly } from '../middleware/rbac';

interface UpdateOrgBody { name: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // Get current org details
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { org_id } = request.user;
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT id, name, created_at FROM orgs WHERE id = ?', [org_id]
    );
    if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Organization not found'));
    return reply.send(success(rows[0]));
  });

  // Update org name (admin only)
  fastify.put<{ Body: UpdateOrgBody }>(
    '/',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { name } = request.body;

      if (!name)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name is required'));

      await fastify.db.execute(
        'UPDATE orgs SET name = ? WHERE id = ?', [name, org_id]
      );
      return reply.send(success({ message: 'Organization updated' }));
    }
  );
};
