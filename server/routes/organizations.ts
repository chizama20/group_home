import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { orgAdminOnly, managerOrAbove } from '../middleware/rbac';

interface IdParam       { id: string; }
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

  // Update org name (org_admin only)
  fastify.put<{ Body: UpdateOrgBody }>(
    '/',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
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

  // List all users in org (manager+)
  fastify.get('/users', { preHandler: [fastify.authenticate, managerOrAbove] }, async (request, reply) => {
    const { org_id } = request.user;
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT id, first_name, last_name, email, role, is_active, created_at FROM users WHERE org_id = ? ORDER BY last_name, first_name',
      [org_id]
    );
    return reply.send(success(rows));
  });

  // Deactivate a user (manager+)
  fastify.put<{ Params: IdParam }>(
    '/users/:id/deactivate',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id, id: requesterId } = request.user;
      const targetId = request.params.id;

      if (targetId === requesterId)
        return reply.code(400).send(failure('INVALID', 'You cannot deactivate your own account'));

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND org_id = ?', [targetId, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      await fastify.db.execute(
        'UPDATE users SET is_active = 0 WHERE id = ? AND org_id = ?', [targetId, org_id]
      );
      return reply.send(success({ message: 'User deactivated' }));
    }
  );
};
