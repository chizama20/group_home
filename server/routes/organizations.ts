import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { ownerOnly, managerOrAbove } from '../middleware/rbac';

interface IdParam      { id: string; }
interface UpdateOrgBody { name: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // Get current org details
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT id, name, slug, plan, created_at FROM organizations WHERE id = ?', [organizationId]
    );
    if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Organization not found'));
    return reply.send(success(rows[0]));
  });

  // Update org name (owner only)
  fastify.put<{ Body: UpdateOrgBody }>(
    '/',
    { preHandler: [fastify.authenticate, ownerOnly] },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { name } = request.body;

      if (!name)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name is required'));

      await fastify.mysql.query<ResultSetHeader>(
        'UPDATE organizations SET name = ? WHERE id = ?', [name, organizationId]
      );
      return reply.send(success({ message: 'Organization updated' }));
    }
  );

  // List all users in org (manager+)
  fastify.get('/users', { preHandler: [fastify.authenticate, managerOrAbove] }, async (request, reply) => {
    const { organizationId } = request.user;
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT id, name, email, role, phone, position, active, created_at FROM users WHERE organization_id = ? ORDER BY name',
      [organizationId]
    );
    return reply.send(success(rows));
  });

  // Deactivate a user (manager+)
  fastify.put<{ Params: IdParam }>(
    '/users/:id/deactivate',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { organizationId, id: requesterId } = request.user;
      const targetId = Number(request.params.id);

      if (targetId === requesterId)
        return reply.code(400).send(failure('INVALID', 'You cannot deactivate your own account'));

      const [check] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND organization_id = ?', [targetId, organizationId]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      await fastify.mysql.query<ResultSetHeader>(
        'UPDATE users SET active = 0 WHERE id = ? AND organization_id = ?', [targetId, organizationId]
      );
      return reply.send(success({ message: 'User deactivated' }));
    }
  );
};
