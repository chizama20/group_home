import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { orgAdminOnly, managerOrAbove } from '../middleware/rbac';

interface HomeBody   { name: string; address?: string; }
interface HomeParam  { id: string; }
interface AssignBody { userId: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // List all homes in org
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { org_id } = request.user;
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT * FROM homes WHERE org_id = ? AND is_active = 1 ORDER BY name',
      [org_id]
    );
    return reply.send(success(rows));
  });

  // Get single home
  fastify.get<{ Params: HomeParam }>('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { org_id } = request.user;
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT * FROM homes WHERE id = ? AND org_id = ?',
      [request.params.id, org_id]
    );
    if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
    return reply.send(success(rows[0]));
  });

  // Create a new home (org_admin only)
  fastify.post<{ Body: HomeBody }>(
    '/',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { name, address } = request.body;

      if (!name)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name is required'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO homes (id, org_id, name, address) VALUES (?, ?, ?, ?)',
        [id, org_id, name, address ?? null]
      );
      return reply.code(201).send(success({ id, name }));
    }
  );

  // Update a home (org_admin only)
  fastify.put<{ Params: HomeParam; Body: HomeBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { name, address } = request.body;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?',
        [request.params.id, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      await fastify.db.execute(
        'UPDATE homes SET name = ?, address = ? WHERE id = ?',
        [name, address ?? null, request.params.id]
      );
      return reply.send(success({ message: 'Home updated' }));
    }
  );

  // Get staff assigned to a home (manager+)
  fastify.get<{ Params: HomeParam }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?',
        [request.params.id, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role
         FROM users u
         JOIN home_staff hs ON u.id = hs.user_id
         WHERE hs.home_id = ? AND u.is_active = 1
         ORDER BY u.last_name, u.first_name`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // Assign a user to a home (org_admin only)
  fastify.post<{ Params: HomeParam; Body: AssignBody }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id, id: addedBy } = request.user;
      const { userId } = request.body;

      if (!userId)
        return reply.code(400).send(failure('MISSING_FIELDS', 'userId is required'));

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?',
        [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const [userCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND org_id = ?',
        [userId, org_id]
      );
      if (!userCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT IGNORE INTO home_staff (id, home_id, user_id, added_by) VALUES (?, ?, ?, ?)',
        [id, request.params.id, userId, addedBy]
      );
      return reply.send(success({ message: 'User assigned to home' }));
    }
  );

  // Remove a user from a home (org_admin only)
  fastify.delete<{ Params: HomeParam; Body: AssignBody }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { userId } = request.body;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?',
        [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      await fastify.db.execute(
        'DELETE FROM home_staff WHERE user_id = ? AND home_id = ?',
        [userId, request.params.id]
      );
      return reply.send(success({ message: 'User removed from home' }));
    }
  );
};
