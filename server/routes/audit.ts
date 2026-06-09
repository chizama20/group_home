import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { orgAdminOnly } from '../middleware/rbac';

interface AuditLogQuery {
  action?: string;
  entity_type?: string;
  user_id?: string;
  // primary param names per spec
  date_from?: string;
  date_to?: string;
  // legacy aliases (kept for back-compat)
  from?: string;
  to?: string;
  page?: string;
  per_page?: string;
  // legacy alias
  limit?: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── GET /audit-logs — paginated audit logs (org_admin only) ─────────────────
  fastify.get<{ Querystring: AuditLogQuery }>(
    '/',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const {
        action, entity_type, user_id,
        date_from, date_to,
        from, to,
        page: pageStr, per_page: perPageStr, limit: limitStr,
      } = request.query;

      const page    = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
      const perPage = Math.min(200, Math.max(1, parseInt(perPageStr ?? limitStr ?? '50', 10) || 50));
      const offset  = (page - 1) * perPage;

      // Support both date_from/date_to (spec) and from/to (legacy)
      const effectiveFrom = date_from ?? from;
      const effectiveTo   = date_to   ?? to;

      const filters: string[] = ['al.org_id = ?'];
      const values: (string | number)[] = [org_id];

      if (action) {
        filters.push('al.action = ?');
        values.push(action);
      }
      if (entity_type) {
        filters.push('al.entity_type = ?');
        values.push(entity_type);
      }
      if (user_id) {
        filters.push('al.user_id = ?');
        values.push(user_id);
      }
      if (effectiveFrom) {
        filters.push('al.created_at >= ?');
        values.push(effectiveFrom);
      }
      if (effectiveTo) {
        filters.push('al.created_at <= ?');
        values.push(effectiveTo);
      }

      const whereClause = filters.join(' AND ');

      // Get total count
      const [[countResult]] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM audit_logs al WHERE ${whereClause}`,
        values
      );
      const total = countResult?.total ?? 0;

      // Get paginated results with actor name
      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT al.id, al.action, al.entity_type, al.entity_id, al.description,
                al.ip_address, al.user_agent, al.created_at,
                u.first_name as user_first, u.last_name as user_last, u.email as user_email
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [...values, perPage, offset]
      );

      return reply.send(success(rows, {
        total: Number(total),
        page,
        per_page: perPage,
        pages: Math.ceil(Number(total) / perPage),
      }));
    }
  );
};
