import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../../utils/response';
import { hashPassword } from '../../utils/password';
import { sendOrgApprovedEmail, sendOrgRejectedEmail, sendWelcomeEmail } from '../../services/email';

interface IdParam      { id: string; }
interface RejectBody   { reason?: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── GET /admin/org-requests ───────────────────────────────────────────────
  fastify.get('/', { preHandler: [fastify.adminAuthenticate] }, async (request, reply) => {
    const { status } = request.query as { status?: string };

    const where = (!status || status === 'pending') ? "WHERE status = 'pending'" : '';
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT id, org_name, contact_name, contact_email, contact_phone,
              num_homes, state, facility_type, status, created_at
       FROM org_requests
       ${where}
       ORDER BY created_at DESC`
    );
    return reply.send(success(rows));
  });

  // ── GET /admin/org-requests/:id ───────────────────────────────────────────
  fastify.get<{ Params: IdParam }>('/:id', { preHandler: [fastify.adminAuthenticate] }, async (request, reply) => {
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT * FROM org_requests WHERE id = ?',
      [request.params.id]
    );
    if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Request not found'));
    return reply.send(success(rows[0]));
  });

  // ── POST /admin/org-requests/:id/approve ─────────────────────────────────
  fastify.post<{ Params: IdParam }>('/:id/approve', { preHandler: [fastify.adminAuthenticate] }, async (request, reply) => {
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      "SELECT * FROM org_requests WHERE id = ? AND status = 'pending'",
      [request.params.id]
    );
    const req = rows[0];
    if (!req) return reply.code(404).send(failure('NOT_FOUND', 'Pending request not found'));

    const orgId  = uuidv4();
    const userId = uuidv4();

    const conn = await fastify.db.getConnection();
    try {
      await conn.beginTransaction();

      // Create org — status depends on whether DocuSign is configured
      const docuSignConfigured = !!process.env.DOCUSIGN_TEMPLATE_ID;
      const orgStatus          = docuSignConfigured ? 'pending_baa' : 'active';

      await conn.execute(
        'INSERT INTO orgs (id, name, facility_type, status) VALUES (?, ?, ?, ?)',
        [orgId, req.org_name, req.facility_type, orgStatus]
      );

      // Create org_admin user — hash a discarded random value, user sets their real password via the reset link below
      const password_hash = await hashPassword(uuidv4());
      const nameParts     = (req.contact_name as string).trim().split(' ');
      const first_name    = nameParts[0] ?? req.contact_name;
      const last_name     = nameParts.slice(1).join(' ') || '-';

      await conn.execute(
        'INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, orgId, req.contact_email, password_hash, first_name, last_name, 'org_admin']
      );

      // Generate a 48-hour set-password token so org_admin can set their own password
      const resetToken  = uuidv4();
      const resetExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await conn.execute(
        'INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [uuidv4(), userId, resetToken, resetExpiry]
      );

      // Mark request approved
      await conn.execute(
        "UPDATE org_requests SET status = 'approved', reviewed_at = NOW() WHERE id = ?",
        [req.id]
      );

      await conn.commit();

      const setPasswordUrl = `${process.env.APP_URL}/reset-password/${resetToken}`;

      // DocuSign stub — if not configured, activate immediately
      let baaEnvelopeId: string | null = null;
      if (docuSignConfigured) {
        // TODO: integrate DocuSign envelope creation here (Sprint 2 Step 20)
        // baaEnvelopeId = await createDocuSignEnvelope(req, orgId)
        // await fastify.db.execute('UPDATE orgs SET baa_envelope_id = ? WHERE id = ?', [baaEnvelopeId, orgId])
      }

      // Send emails
      await sendOrgApprovedEmail(req.contact_email, req.org_name, `${process.env.APP_URL}/login`).catch(err => fastify.log.error({ err }, 'sendOrgApprovedEmail failed'));

      if (!docuSignConfigured) {
        // No DocuSign — send welcome email with set-password link since org is already active
        await sendWelcomeEmail(req.contact_email, first_name, req.org_name, setPasswordUrl).catch(err => fastify.log.error({ err }, 'sendWelcomeEmail failed'));
      }

      return reply.send(success({
        org_id:         orgId,
        user_id:        userId,
        status:         orgStatus,
        baa_envelope_id: baaEnvelopeId,
      }));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  // ── POST /admin/org-requests/:id/reject ───────────────────────────────────
  fastify.post<{ Params: IdParam; Body: RejectBody }>('/:id/reject', { preHandler: [fastify.adminAuthenticate] }, async (request, reply) => {
    const { reason } = request.body;

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      "SELECT * FROM org_requests WHERE id = ? AND status = 'pending'",
      [request.params.id]
    );
    const req = rows[0];
    if (!req) return reply.code(404).send(failure('NOT_FOUND', 'Pending request not found'));

    await fastify.db.execute(
      "UPDATE org_requests SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW() WHERE id = ?",
      [reason ?? null, req.id]
    );

    await sendOrgRejectedEmail(req.contact_email, req.org_name, reason ?? '').catch(() => {});

    return reply.send(success({ message: 'Request rejected' }));
  });
};
