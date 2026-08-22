import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { Role } from '../types';

type RequestUser = { role: Role; id: string; org_id: string };

/**
 * Returns home IDs the user can access.
 * null means "all homes" (admin — no restriction).
 */
export async function getAccessibleHomeIds(
  fastify: FastifyInstance,
  user: RequestUser
): Promise<string[] | null> {
  if (user.role === 'admin') return null;

  const [rows] = await fastify.db.execute<RowDataPacket[]>(
    'SELECT home_id FROM home_staff WHERE user_id = ?', [user.id]
  );
  return rows.map((r) => r.home_id as string);
}

/**
 * Builds a SQL fragment like " AND home_id IN (?,?,?)" or " AND 1=0" (no access).
 * Returns empty string for admins.
 */
export function homeFilter(homeIds: string[] | null, column = 'home_id'): string {
  if (homeIds === null) return '';
  if (homeIds.length === 0) return ' AND 1=0';
  return ` AND ${column} IN (${homeIds.map(() => '?').join(',')})`;
}

/**
 * Checks whether a user has access to a specific home.
 */
export async function canAccessHome(
  fastify: FastifyInstance,
  user: RequestUser,
  homeId: string
): Promise<boolean> {
  if (user.role === 'admin') return true;
  const [rows] = await fastify.db.execute<RowDataPacket[]>(
    'SELECT 1 FROM home_staff WHERE user_id = ? AND home_id = ?', [user.id, homeId]
  );
  return rows.length > 0;
}
