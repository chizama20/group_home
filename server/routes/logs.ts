import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { DailyLog } from '../types';

type LogBody = Omit<DailyLog, 'id' | 'user_id' | 'logged_at'>;

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (_request, reply) => {
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      `SELECT dl.*, r.first_name, r.last_name, u.name as staff_name
       FROM daily_logs dl
       JOIN residents r ON dl.resident_id = r.id
       JOIN users u ON dl.user_id = u.id
       ORDER BY dl.logged_at DESC`
    );
    return reply.send(success(rows));
  });

  fastify.post<{ Body: LogBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { resident_id, mood, behavior, notes } = request.body;
    const user_id = request.user.id;

    if (!resident_id || !mood || !behavior)
      return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, mood, and behavior are required'));

    const [result] = await fastify.mysql.query<ResultSetHeader>(
      'INSERT INTO daily_logs (resident_id, user_id, mood, behavior, notes) VALUES (?, ?, ?, ?, ?)',
      [resident_id, user_id, mood, behavior, notes ?? null]
    );
    return reply.code(201).send(success({ id: result.insertId }));
  });
};
