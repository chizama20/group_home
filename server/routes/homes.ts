import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { ownerOnly, managerOrAbove } from '../middleware/rbac';

interface HomeBody   { name: string; address?: string; phone?: string; }
interface HomeParam  { id: string; }
interface AssignBody { userId: number; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // List all homes in org
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT * FROM homes WHERE organization_id = ? AND active = 1 ORDER BY name',
      [organizationId]
    );
    return reply.send(success(rows));
  });

  // Get single home
  fastify.get<{ Params: HomeParam }>('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT * FROM homes WHERE id = ? AND organization_id = ?',
      [request.params.id, organizationId]
    );
    if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
    return reply.send(success(rows[0]));
  });

  // Create a new home (owner only)
  fastify.post<{ Body: HomeBody }>(
    '/',
    { preHandler: [fastify.authenticate, ownerOnly] },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { name, address, phone } = request.body;

      if (!name)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name is required'));

      const [result] = await fastify.mysql.query<ResultSetHeader>(
        'INSERT INTO homes (organization_id, name, address, phone) VALUES (?, ?, ?, ?)',
        [organizationId, name, address ?? null, phone ?? null]
      );
      return reply.code(201).send(success({ id: result.insertId, name }));
    }
  );

  // Update a home (owner only)
  fastify.put<{ Params: HomeParam; Body: HomeBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, ownerOnly] },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { name, address, phone } = request.body;

      const [check] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND organization_id = ?',
        [request.params.id, organizationId]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      await fastify.mysql.query(
        'UPDATE homes SET name = ?, address = ?, phone = ? WHERE id = ?',
        [name, address ?? null, phone ?? null, request.params.id]
      );
      return reply.send(success({ message: 'Home updated' }));
    }
  );

  // Get staff assigned to a home (manager+)
  fastify.get<{ Params: HomeParam }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { organizationId } = request.user;
      const [check] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND organization_id = ?',
        [request.params.id, organizationId]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const [rows] = await fastify.mysql.query<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email, u.role, u.phone, u.position
         FROM users u
         JOIN user_homes uh ON u.id = uh.user_id
         WHERE uh.home_id = ? AND u.active = 1
         ORDER BY u.name`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // Assign a user to a home (owner only)
  fastify.post<{ Params: HomeParam; Body: AssignBody }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, ownerOnly] },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { userId } = request.body;

      if (!userId)
        return reply.code(400).send(failure('MISSING_FIELDS', 'userId is required'));

      // Verify home belongs to org
      const [homeCheck] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND organization_id = ?',
        [request.params.id, organizationId]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      // Verify user belongs to org
      const [userCheck] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND organization_id = ?',
        [userId, organizationId]
      );
      if (!userCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      // Upsert — ignore if already assigned
      await fastify.mysql.query(
        'INSERT IGNORE INTO user_homes (user_id, home_id) VALUES (?, ?)',
        [userId, request.params.id]
      );
      return reply.send(success({ message: 'User assigned to home' }));
    }
  );

  // Remove a user from a home (owner only)
  fastify.delete<{ Params: HomeParam; Body: AssignBody }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, ownerOnly] },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { userId } = request.body;

      const [homeCheck] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND organization_id = ?',
        [request.params.id, organizationId]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      await fastify.mysql.query(
        'DELETE FROM user_homes WHERE user_id = ? AND home_id = ?',
        [userId, request.params.id]
      );
      return reply.send(success({ message: 'User removed from home' }));
    }
  );
};
