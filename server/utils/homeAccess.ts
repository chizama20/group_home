import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { Role } from '../types';

type RequestUser = { role: Role; id: number; organizationId: number };

/**
 * Returns home IDs the user can access.
 * null means "all homes" (owner — no restriction).
 */
export async function getAccessibleHomeIds(
  fastify: FastifyInstance,
  user: RequestUser
): Promise<number[] | null> {
  if (user.role === 'owner') return null;

  const [rows] = await fastify.mysql.query<RowDataPacket[]>(
    'SELECT home_id FROM user_homes WHERE user_id = ?', [user.id]
  );
  return rows.map((r: any) => r.home_id as number);
}

/**
 * Builds a SQL fragment like " AND home_id IN (1,2,3)" or " AND 1=0" (no access).
 * Returns empty string for owners.
 */
export function homeFilter(homeIds: number[] | null, column = 'home_id'): string {
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
  homeId: number
): Promise<boolean> {
  if (user.role === 'owner') return true;
  const [rows] = await fastify.mysql.query<RowDataPacket[]>(
    'SELECT 1 FROM user_homes WHERE user_id = ? AND home_id = ?', [user.id, homeId]
  );
  return rows.length > 0;
}
