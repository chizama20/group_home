import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../utils/password';
import { success, failure } from '../utils/response';
import { orgAdminOnly, managerOrAbove } from '../middleware/rbac';
import { Role } from '../types';

interface InviteBody        { first_name: string; last_name: string; email: string; password: string; role: Role; }
interface IdParam           { id: string; }
interface OrgIdParam        { orgId: string; }
interface AnnouncementBody  { title: string; body: string; home_id?: string; is_pinned?: boolean; }

const VALID_ROLES: Role[] = ['employee', 'manager', 'org_admin'];

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── POST /orgs/invite — create user (org_admin only) ─────────────────────
  fastify.post<{ Body: InviteBody }>(
    '/invite',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { first_name, last_name, email, password, role } = request.body;
      const { org_id, id: invited_by } = request.user;

      if (!first_name || !last_name || !email || !password || !role)
        return reply.code(400).send(failure('MISSING_FIELDS', 'first_name, last_name, email, password, and role are required'));

      if (!VALID_ROLES.includes(role))
        return reply.code(400).send(failure('INVALID_ROLE', 'Role must be employee, manager, or org_admin'));

      const [existing] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND org_id = ?', [email, org_id]
      );
      if (existing[0])
        return reply.code(409).send(failure('EMAIL_TAKEN', 'Email already in use within this organization'));

      const userId        = uuidv4();
      const password_hash = await hashPassword(password);
      await fastify.db.execute(
        'INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, org_id, email, password_hash, first_name, last_name, role, invited_by]
      );

      return reply.code(201).send(success({ id: userId, first_name, last_name, email, role }));
    }
  );

  // ── GET /orgs/:id/staff — list all staff in org (manager+) ───────────────
  fastify.get<{ Params: IdParam }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;

      // Ignore :id — always scope to the JWT org for security
      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT id, first_name, last_name, email, role, is_active, created_at
         FROM users
         WHERE org_id = ?
         ORDER BY last_name, first_name`,
        [org_id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /orgs/:orgId/announcements — post announcement (manager+) ────────
  fastify.post<{ Params: OrgIdParam; Body: AnnouncementBody }>(
    '/:orgId/announcements',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { id: posted_by, org_id } = request.user;
      const { title, body, home_id, is_pinned } = request.body;

      if (!title || !body)
        return reply.code(400).send(failure('MISSING_FIELDS', 'title and body are required'));

      // If home_id provided, verify it belongs to this org
      if (home_id) {
        const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
          'SELECT id FROM homes WHERE id = ? AND org_id = ?', [home_id, org_id]
        );
        if (!homeCheck[0])
          return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      }

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO announcements (id, org_id, home_id, posted_by, title, body, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, org_id, home_id ?? null, posted_by, title, body, is_pinned ?? false]
      );

      return reply.code(201).send(success({ id }));
    }
  );
};
