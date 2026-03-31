import { FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export type AuditAction = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'SIGN' | 'INVITE' | 'EXPORT';

export async function logAudit(
  request: FastifyRequest,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  description?: string
): Promise<void> {
  try {
    const { id: user_id, org_id } = request.user;
    const ip_address = request.ip;
    const user_agent = request.headers['user-agent'] ?? null;

    await (request.server as any).db.execute(
      `INSERT INTO audit_logs (id, org_id, user_id, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), org_id, user_id, action, entityType, entityId, description ?? null, ip_address, user_agent]
    );
  } catch {
    // Non-fatal — never block a request because audit logging failed
  }
}
