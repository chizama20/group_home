import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { DailyLog } from '../types';

type LogBody = Omit<DailyLog, 'id' | 'organization_id' | 'user_id' | 'logged_at'>;

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      `SELECT dl.*, r.first_name, r.last_name, u.name as staff_name
       FROM daily_logs dl
       JOIN residents r ON dl.resident_id = r.id
       JOIN users u ON dl.user_id = u.id
       WHERE dl.organization_id = ?
       ORDER BY dl.logged_at DESC`,
      [organizationId]
    );
    return reply.send(success(rows));
  });

  fastify.post<{ Body: LogBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId, id: user_id } = request.user;
    const { resident_id, mood, behavior, notes } = request.body;

    if (!resident_id || !mood || !behavior)
      return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, mood, and behavior are required'));

    // Verify resident belongs to this org
    const [check] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT id FROM residents WHERE id = ? AND organization_id = ?', [resident_id, organizationId]
    );
    if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

    const [result] = await fastify.mysql.query<ResultSetHeader>(
      'INSERT INTO daily_logs (organization_id, resident_id, user_id, mood, behavior, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [organizationId, resident_id, user_id, mood, behavior, notes ?? null]
    );
    return reply.code(201).send(success({ id: result.insertId }));
  });
};
