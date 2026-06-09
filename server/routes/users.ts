import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';
import { success, failure } from '../utils/response';
import { orgAdminOnly } from '../middleware/rbac';
import { logAudit } from '../utils/audit';
import { hashPassword, comparePassword } from '../utils/password';
import { Role } from '../types';

interface IdParam            { id: string; }
interface UpdateBody         { first_name?: string; last_name?: string; email?: string; }
interface RoleBody           { role: Role; }
interface SetPinBody         { current_password: string; pin: string; }
interface VerifyPinBody      { pin: string; }
interface ChangePasswordBody { current_password: string; new_password: string; }

const VALID_ROLES: Role[] = ['employee', 'manager', 'org_admin'];
// Roles that can be assigned via PATCH /users/:id/role (cannot elevate to org_admin)
const ASSIGNABLE_ROLES: Role[] = ['employee', 'manager'];

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

  // ── POST /users/me/password — change password (authenticated) ────────────────
  fastify.post<{ Body: ChangePasswordBody }>(
    '/me/password',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.user;
      const { current_password, new_password } = request.body;

      if (!current_password || !new_password)
        return reply.code(400).send(failure('MISSING_FIELDS', 'current_password and new_password are required'));

      if (new_password.length < 8)
        return reply.code(400).send(failure('INVALID_PASSWORD', 'New password must be at least 8 characters'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT password_hash FROM users WHERE id = ?', [id]
      );
      if (!rows[0])
        return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      const validPassword = await comparePassword(current_password, rows[0].password_hash);
      if (!validPassword)
        return reply.code(401).send(failure('INVALID_PASSWORD', 'Current password is incorrect'));

      const new_password_hash = await hashPassword(new_password);
      await fastify.db.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [new_password_hash, id]
      );

      return reply.send(success({ message: 'Password changed successfully' }));
    }
  );

  // ── POST /users/me/signing-pin — set or change 4-digit PIN ──────────────────
  fastify.post<{ Body: SetPinBody }>(
    '/me/signing-pin',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.user;
      const { current_password, pin } = request.body;

      if (!current_password || !pin)
        return reply.code(400).send(failure('MISSING_FIELDS', 'current_password and pin are required'));

      if (!/^\d{4}$/.test(pin))
        return reply.code(400).send(failure('INVALID_PIN', 'PIN must be exactly 4 digits'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT password_hash FROM users WHERE id = ?', [id]
      );
      if (!rows[0])
        return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      const validPassword = await comparePassword(current_password, rows[0].password_hash);
      if (!validPassword)
        return reply.code(401).send(failure('INVALID_PASSWORD', 'Current password is incorrect'));

      const signing_pin_hash = await hashPassword(pin);
      await fastify.db.execute(
        'UPDATE users SET signing_pin_hash = ?, pin_set_at = NOW() WHERE id = ?',
        [signing_pin_hash, id]
      );

      return reply.send(success({ message: 'Signing PIN set successfully' }));
    }
  );

  // ── POST /users/me/signing-pin/verify — verify PIN, return short-lived sign_token ──
  fastify.post<{ Body: VerifyPinBody }>(
    '/me/signing-pin/verify',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.user;
      const { pin } = request.body;

      if (!pin || !/^\d{4}$/.test(pin))
        return reply.code(400).send(failure('INVALID_PIN', 'PIN must be exactly 4 digits'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT signing_pin_hash FROM users WHERE id = ?', [id]
      );
      if (!rows[0] || !rows[0].signing_pin_hash)
        return reply.code(400).send(failure('PIN_NOT_SET', 'Signing PIN has not been set'));

      const valid = await comparePassword(pin, rows[0].signing_pin_hash);
      if (!valid)
        return reply.code(401).send(failure('INVALID_PIN', 'Incorrect PIN'));

      // Short-lived sign token — 5 minutes, sub = 'sign' to distinguish from auth tokens
      const jwtSecret = process.env.JWT_SECRET!;
      const sign_token = jwt.sign({ sub: 'sign', user_id: id }, jwtSecret, { expiresIn: '5m' });

      return reply.send(success({ sign_token }));
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

      // Cannot promote to org_admin via this route
      if (!ASSIGNABLE_ROLES.includes(role))
        return reply.code(400).send(failure('INVALID_ROLE', 'Role must be employee or manager'));

      if (targetId === requesterId)
        return reply.code(400).send(failure('INVALID', 'You cannot change your own role'));

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, role, first_name, last_name FROM users WHERE id = ? AND org_id = ?', [targetId, org_id]
      );
      if (!check[0])
        return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      const previousRole = check[0].role as string;

      await fastify.db.execute(
        'UPDATE users SET role = ? WHERE id = ?', [role, targetId]
      );

      const [[updatedUser]] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, first_name, last_name, email, role, is_active FROM users WHERE id = ?', [targetId]
      );

      void logAudit(fastify, {
        org_id, user_id: requesterId,
        action: 'UPDATE', entity_type: 'user', entity_id: targetId,
        description: `Role changed from ${previousRole} to ${role} for ${check[0].first_name} ${check[0].last_name}`,
      });

      return reply.send(success({ user: updatedUser }));
    }
  );
};
