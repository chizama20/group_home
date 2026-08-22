import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';
import { success, failure } from '../utils/response';
import { adminOnly } from '../middleware/rbac';
import { logAudit } from '../utils/audit';
import { hashPassword, comparePassword } from '../utils/password';
import { Role } from '../types';

interface IdParam            { id: string; }
interface UpdateBody         { first_name?: string; last_name?: string; email?: string; phone?: string; }
interface RoleBody           { role: Role; }
interface SetPinBody         { current_password: string; pin: string; }
interface VerifyPinBody      { pin: string; }
interface ChangePasswordBody { current_password: string; new_password: string; }
interface NotificationPrefsBody {
  announcements?:     boolean;
  schedule_changes?:  boolean;
  trade_claimed?:     boolean;
}

// Roles that can be assigned via PATCH /users/:id/role (cannot elevate to admin)
const ASSIGNABLE_ROLES: Role[] = ['staff'];

export default async (fastify: FastifyInstance): Promise<void> => {

  // â”€â”€ PATCH /users/:id â€” update profile (self or manager+) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: IdParam; Body: UpdateBody }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: requesterId, role, org_id } = request.user;
      const targetId = request.params.id;

      // Allow if self, or if admin
      const isSelf  = requesterId === targetId;
      const isAdmin = role === 'admin';

      if (!isSelf && !isAdmin)
        return reply.code(403).send(failure('FORBIDDEN', 'Insufficient permissions'));

      // Verify target user is in same org
      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND org_id = ?', [targetId, org_id]
      );
      if (!check[0])
        return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      const { first_name, last_name, email, phone } = request.body;

      if (!first_name && !last_name && !email && phone === undefined)
        return reply.code(400).send(failure('MISSING_FIELDS', 'At least one field (first_name, last_name, email, phone) is required'));

      const updates: string[] = [];
      const values: (string | null)[] = [];
      if (first_name)           { updates.push('first_name = ?'); values.push(first_name); }
      if (last_name)            { updates.push('last_name = ?');  values.push(last_name); }
      if (email)                { updates.push('email = ?');      values.push(email); }
      if (phone !== undefined)  { updates.push('phone = ?');      values.push(phone || null); }

      values.push(targetId);
      await fastify.db.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values
      );

      return reply.send(success({ message: 'User updated' }));
    }
  );

  // â”€â”€ PATCH /users/:id/deactivate â€” set is_active=0 (admin only) â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: IdParam }>(
    '/:id/deactivate',
    { preHandler: [fastify.authenticate, adminOnly] },
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

  // â”€â”€ POST /users/me/password â€” change password (authenticated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ POST /users/me/signing-pin â€” set or change 4-digit PIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ POST /users/me/signing-pin/verify â€” verify PIN, return short-lived sign_token â”€â”€
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

      // Short-lived sign token â€” 5 minutes, sub = 'sign' to distinguish from auth tokens
      const jwtSecret = process.env.JWT_SECRET!;
      const sign_token = jwt.sign({ sub: 'sign', user_id: id }, jwtSecret, { expiresIn: '5m' });

      return reply.send(success({ sign_token }));
    }
  );

  // â”€â”€ PATCH /users/:id/role â€” change role (admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: IdParam; Body: RoleBody }>(
    '/:id/role',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { id: requesterId, org_id } = request.user;
      const targetId = request.params.id;
      const { role }  = request.body;

      if (!role)
        return reply.code(400).send(failure('MISSING_FIELDS', 'role is required'));

      // Cannot promote to admin via this route
      if (!ASSIGNABLE_ROLES.includes(role))
        return reply.code(400).send(failure('INVALID_ROLE', 'Role must be staff'));

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

  // ── PATCH /users/me/notification-prefs — update notification toggles ──────
  fastify.patch<{ Body: NotificationPrefsBody }>(
    '/me/notification-prefs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.user;

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT notification_prefs FROM users WHERE id = ?', [id]
      );
      if (!rows[0])
        return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      const current = (rows[0].notification_prefs ?? {}) as Record<string, boolean>;
      const merged = {
        announcements:    current.announcements    ?? true,
        schedule_changes: current.schedule_changes ?? true,
        trade_claimed:    current.trade_claimed    ?? true,
        ...request.body,
      };

      await fastify.db.execute(
        'UPDATE users SET notification_prefs = ? WHERE id = ?',
        [JSON.stringify(merged), id]
      );

      return reply.send(success({ notification_prefs: merged }));
    }
  );
};
