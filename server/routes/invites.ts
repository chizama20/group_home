import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { orgAdminOnly } from '../middleware/rbac';
import { logAudit } from '../utils/audit';
import { sendInviteEmail } from '../services/email';

interface TokenParam { token: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── POST /invites/:token/resend — resend a pending invite by token ─────────
  fastify.post<{ Params: TokenParam }>(
    '/:token/resend',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id, id: userId } = request.user;
      const { token } = request.params;

      // Look up invite by token scoped to this org, still pending and not expired
      const [invitations] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT i.*, u.first_name as inviter_first, u.last_name as inviter_last, o.name as org_name
         FROM invitations i
         JOIN users u ON i.invited_by = u.id
         JOIN orgs o ON i.org_id = o.id
         WHERE i.token = ? AND i.org_id = ? AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
        [token, org_id]
      );
      if (!invitations[0])
        return reply.code(404).send(failure('NOT_FOUND', 'Invitation not found or already accepted/expired'));

      const invite = invitations[0];
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days

      // Extend expiry and stamp resent_at
      await fastify.db.execute(
        'UPDATE invitations SET expires_at = ?, resent_at = NOW() WHERE id = ?',
        [newExpiresAt, invite.id]
      );

      // Resend email
      const inviteUrl   = `${process.env.APP_URL}/invite/${invite.token}`;
      const inviterName = `${invite.inviter_first} ${invite.inviter_last}`;
      await sendInviteEmail(invite.email, inviteUrl, inviterName, invite.org_name, invite.role);

      void logAudit(fastify, {
        org_id, user_id: userId,
        action: 'INVITE', entity_type: 'invitation', entity_id: invite.id,
        description: `Resent invitation to ${invite.email}`,
      });

      return reply.send(success({ message: 'Invitation resent', expires_at: newExpiresAt }));
    }
  );

};
