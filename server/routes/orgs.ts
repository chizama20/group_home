import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { orgAdminOnly, managerOrAbove } from '../middleware/rbac';
import { sendInviteEmail } from '../services/email';

type InviteRole = 'employee' | 'manager';

interface InviteBody        { email: string; role: InviteRole; home_id?: string; }
interface IdParam           { id: string; }
interface OrgIdParam        { orgId: string; }
interface AnnouncementBody  { title: string; body: string; home_id?: string; is_pinned?: boolean; }

const VALID_INVITE_ROLES: InviteRole[] = ['employee', 'manager'];

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── POST /orgs/invite — send token-based invite email (org_admin only) ───
  fastify.post<{ Body: InviteBody }>(
    '/invite',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { email, role, home_id } = request.body;
      const { org_id, id: invited_by } = request.user;

      if (!email || !role)
        return reply.code(400).send(failure('MISSING_FIELDS', 'email and role are required'));

      if (!VALID_INVITE_ROLES.includes(role))
        return reply.code(400).send(failure('INVALID_ROLE', 'Role must be employee or manager'));

      // Check for existing active user with this email in the org
      const [existing] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND org_id = ?', [email, org_id]
      );
      if (existing[0])
        return reply.code(409).send(failure('EMAIL_TAKEN', 'A user with this email already exists in your organisation'));

      // Validate home_id if provided
      if (home_id) {
        const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
          'SELECT id FROM homes WHERE id = ? AND org_id = ?', [home_id, org_id]
        );
        if (!homeCheck[0])
          return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      }

      // Get inviter name + org name for the email
      const [inviterRows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT u.first_name, u.last_name, o.name as org_name
         FROM users u JOIN orgs o ON u.org_id = o.id
         WHERE u.id = ?`,
        [invited_by]
      );
      const inviter = inviterRows[0];

      const token     = uuidv4();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      const inviteId  = uuidv4();

      await fastify.db.execute(
        'INSERT INTO invitations (id, org_id, home_id, email, role, token, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [inviteId, org_id, home_id ?? null, email, role, token, invited_by, expiresAt]
      );

      const inviteUrl    = `${process.env.APP_URL}/invite/${token}`;
      const inviterName  = `${inviter.first_name} ${inviter.last_name}`;
      await sendInviteEmail(email, inviteUrl, inviterName, inviter.org_name, role);

      return reply.code(201).send(success({ message: 'Invitation sent' }));
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
