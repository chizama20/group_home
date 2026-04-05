import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export type AuditAction = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'SIGN' | 'INVITE' | 'EXPORT';

export async function logAudit(
  fastify: FastifyInstance,
  params: {
    org_id:       string;
    user_id?:     string;
    action:       AuditAction;
    entity_type:  string;
    entity_id?:   string;
    description?: string;
    ip_address?:  string;
    user_agent?:  string;
  }
): Promise<void> {
  try {
    await fastify.db.execute(
      `INSERT INTO audit_logs (id, org_id, user_id, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        params.org_id,
        params.user_id    ?? null,
        params.action,
        params.entity_type,
        params.entity_id  ?? null,
        params.description ?? null,
        params.ip_address  ?? null,
        params.user_agent  ?? null,
      ]
    );
  } catch {
    // Non-fatal — never block a request because audit logging failed
  }
}
