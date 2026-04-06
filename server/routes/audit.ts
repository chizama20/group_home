import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { orgAdminOnly } from '../middleware/rbac';

interface AuditLogQuery {
  action?: string;
  entity_type?: string;
  user_id?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── GET /audit-logs — paginated audit logs (org_admin only) ─────────────────
  fastify.get<{ Querystring: AuditLogQuery }>(
    '/',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { action, entity_type, user_id, from, to, page: pageStr, limit: limitStr } = request.query;

      const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? '50', 10) || 50));
      const offset = (page - 1) * limit;

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
      if (from) {
        filters.push('al.created_at >= ?');
        values.push(from);
      }
      if (to) {
        filters.push('al.created_at <= ?');
        values.push(to);
      }

      const whereClause = filters.join(' AND ');

      // Get total count
      const [[countResult]] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM audit_logs al WHERE ${whereClause}`,
        values
      );
      const total = countResult?.total ?? 0;

      // Get paginated results
      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT al.id, al.action, al.entity_type, al.entity_id, al.description,
                al.ip_address, al.user_agent, al.created_at,
                u.first_name as user_first, u.last_name as user_last, u.email as user_email
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
      );

      return reply.send(success(rows, {
        total: Number(total),
        page,
        limit,
        pages: Math.ceil(Number(total) / limit)
      }));
    }
  );
};
