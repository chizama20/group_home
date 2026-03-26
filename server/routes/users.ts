import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { orgAdminOnly, managerOrAbove } from '../middleware/rbac';
import { Role } from '../types';

interface IdParam       { id: string; }
interface UpdateBody    { first_name?: string; last_name?: string; email?: string; }
interface RoleBody      { role: Role; }

const VALID_ROLES: Role[] = ['employee', 'manager', 'org_admin'];

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /users/:id — update profile (self or manager+) ─────────────────
  fastify.patch<{ Params: IdParam; Body: UpdateBody }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: requesterId, role, org_id } = request.user;
      const targetId = request.params.id;

      // Allow if self, or if manager/org_admin
      const isSelf          = requesterId === targetId;
      const isManagerAbove  = role === 'manager' || role === 'org_admin';

      if (!isSelf && !isManagerAbove)
        return reply.code(403).send(failure('FORBIDDEN', 'Insufficient permissions'));

      // Verify target user is in same org
      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND org_id = ?', [targetId, org_id]
      );
      if (!check[0])
        return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      const { first_name, last_name, email } = request.body;

      if (!first_name && !last_name && !email)
        return reply.code(400).send(failure('MISSING_FIELDS', 'At least one field (first_name, last_name, email) is required'));

      const updates: string[] = [];
      const values: string[] = [];
      if (first_name) { updates.push('first_name = ?'); values.push(first_name); }
      if (last_name)  { updates.push('last_name = ?');  values.push(last_name); }
      if (email)      { updates.push('email = ?');      values.push(email); }

      values.push(targetId);
      await fastify.db.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values
      );

      return reply.send(success({ message: 'User updated' }));
    }
  );

  // ── PATCH /users/:id/deactivate — set is_active=0 (org_admin only) ───────
  fastify.patch<{ Params: IdParam }>(
    '/:id/deactivate',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { id: requesterId, org_id } = request.user;
      const targetId = request.params.id;

      if (targetId === requesterId)
        return reply.code(400).send(failure('INVALID', 'You cannot deactivate your own account'));

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND org_id = ?', [targetId, org_id]
      );
      if (!check[0])
        return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      await fastify.db.execute(
        'UPDATE users SET is_active = 0 WHERE id = ?', [targetId]
      );

      return reply.send(success({ message: 'User deactivated' }));
    }
  );

  // ── PATCH /users/:id/role — change role (org_admin only) ──────────────────
  fastify.patch<{ Params: IdParam; Body: RoleBody }>(
    '/:id/role',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { id: requesterId, org_id } = request.user;
      const targetId = request.params.id;
      const { role }  = request.body;

      if (!role)
        return reply.code(400).send(failure('MISSING_FIELDS', 'role is required'));

      if (!VALID_ROLES.includes(role))
        return reply.code(400).send(failure('INVALID_ROLE', 'Role must be employee, manager, or org_admin'));

      if (targetId === requesterId)
        return reply.code(400).send(failure('INVALID', 'You cannot change your own role'));

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND org_id = ?', [targetId, org_id]
      );
      if (!check[0])
        return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      await fastify.db.execute(
        'UPDATE users SET role = ? WHERE id = ?', [role, targetId]
      );

      return reply.send(success({ message: 'Role updated' }));
    }
  );
};
