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

  // ── GET /orgs/dashboard — org-wide stats for dashboard (org_admin only) ───
  fastify.get(
    '/dashboard',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;

      // Get total homes count
      const [homesResult] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM homes WHERE org_id = ? AND is_active = 1',
        [org_id]
      );
      const totalHomes = homesResult[0]?.count ?? 0;

      // Get total residents count
      const [residentsResult] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM residents r
         JOIN homes h ON r.home_id = h.id
         WHERE h.org_id = ? AND r.is_active = 1`,
        [org_id]
      );
      const totalResidents = residentsResult[0]?.count ?? 0;

      // Get total staff count
      const [staffResult] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE org_id = ? AND is_active = 1',
        [org_id]
      );
      const totalStaff = staffResult[0]?.count ?? 0;

      // Get open incidents count
      const [incidentsResult] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM incidents i
         JOIN homes h ON i.home_id = h.id
         WHERE h.org_id = ? AND i.status != 'resolved'`,
        [org_id]
      );
      const openIncidents = incidentsResult[0]?.count ?? 0;

      // Get pending invitations count
      const [pendingInvitesResult] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM invitations WHERE org_id = ? AND accepted_at IS NULL AND expires_at > NOW()',
        [org_id]
      );
      const pendingInvites = pendingInvitesResult[0]?.count ?? 0;

      // Get all homes with basic stats
      const [homes] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT
          h.id, h.name, h.address, h.is_active,
          (SELECT COUNT(*) FROM residents r WHERE r.home_id = h.id AND r.is_active = 1) as resident_count,
          (SELECT COUNT(*) FROM user_homes uh JOIN users u ON uh.user_id = u.id WHERE uh.home_id = h.id AND u.is_active = 1) as staff_count
         FROM homes h
         WHERE h.org_id = ? AND h.is_active = 1
         ORDER BY h.name`,
        [org_id]
      );

      // Get needs attention items
      const needsAttention: { type: string; count: number; label: string; severity: string }[] = [];

      if (pendingInvites > 0) {
        needsAttention.push({
          type: 'pending_invites',
          count: pendingInvites,
          label: 'Pending invitations',
          severity: 'info'
        });
      }

      // Get unsigned incidents
      const [unsignedIncidents] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM incidents i
         JOIN homes h ON i.home_id = h.id
         WHERE h.org_id = ? AND i.signed_off_by IS NULL AND i.status != 'resolved'`,
        [org_id]
      );
      if (unsignedIncidents[0]?.count > 0) {
        needsAttention.push({
          type: 'unsigned_incidents',
          count: unsignedIncidents[0].count,
          label: 'Incidents awaiting sign-off',
          severity: 'warning'
        });
      }

      return reply.send(success({
        stats: {
          totalHomes,
          totalResidents,
          totalStaff,
          openIncidents
        },
        homes,
        needsAttention
      }));
    }
  );

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

  // ── GET /orgs/invitations — list pending invites (org_admin only) ─────────
  fastify.get(
    '/invitations',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;

      const [invitations] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT i.id, i.email, i.role, i.home_id, i.invited_by, i.expires_at, i.created_at,
                h.name as home_name,
                u.first_name as inviter_first, u.last_name as inviter_last
         FROM invitations i
         LEFT JOIN homes h ON i.home_id = h.id
         JOIN users u ON i.invited_by = u.id
         WHERE i.org_id = ? AND i.accepted_at IS NULL AND i.expires_at > NOW()
         ORDER BY i.created_at DESC`,
        [org_id]
      );

      return reply.send(success(invitations));
    }
  );

  // ── POST /invitations/:id/resend — resend invite with new expiry (org_admin only) ─
  fastify.post<{ Params: IdParam }>(
    '/invitations/:id/resend',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id, id: resent_by } = request.user;
      const inviteId = request.params.id;

      // Verify invite belongs to this org and is still pending
      const [invitations] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT i.*, u.first_name, u.last_name, o.name as org_name
         FROM invitations i
         JOIN users u ON i.invited_by = u.id
         JOIN orgs o ON i.org_id = o.id
         WHERE i.id = ? AND i.org_id = ? AND i.accepted_at IS NULL`,
        [inviteId, org_id]
      );
      if (!invitations[0])
        return reply.code(404).send(failure('NOT_FOUND', 'Invitation not found or already accepted'));

      const invite = invitations[0];
      const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

      // Update expires_at
      await fastify.db.execute(
        'UPDATE invitations SET expires_at = ? WHERE id = ?',
        [newExpiresAt, inviteId]
      );

      // Resend email
      const inviteUrl = `${process.env.APP_URL}/invite/${invite.token}`;
      const inviterName = `${invite.first_name} ${invite.last_name}`;
      await sendInviteEmail(invite.email, inviteUrl, inviterName, invite.org_name, invite.role);

      return reply.send(success({ message: 'Invitation resent', expires_at: newExpiresAt }));
    }
  );

  // ── DELETE /invitations/:id — cancel invitation (org_admin only) ────────────
  fastify.delete<{ Params: IdParam }>(
    '/invitations/:id',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const inviteId = request.params.id;

      // Verify invite belongs to this org
      const [invitations] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM invitations WHERE id = ? AND org_id = ?',
        [inviteId, org_id]
      );
      if (!invitations[0])
        return reply.code(404).send(failure('NOT_FOUND', 'Invitation not found'));

      await fastify.db.execute('DELETE FROM invitations WHERE id = ?', [inviteId]);

      return reply.send(success({ message: 'Invitation cancelled' }));
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
