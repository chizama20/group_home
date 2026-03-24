import { FastifyInstance } from 'fastify';
import { success, failure } from '../utils/response';
import { DailyLog } from '../types';

type LogBody = Omit<DailyLog, 'id' | 'user_id' | 'logged_at'>;

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (_request, reply) => {
      fastify.mysql.query(
        `SELECT dl.*, r.first_name, r.last_name, u.name as staff_name
         FROM daily_logs dl
         JOIN residents r ON dl.resident_id = r.id
         JOIN users u ON dl.user_id = u.id
         ORDER BY dl.logged_at DESC`,
        (err: Error | null, results: any[]) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          reply.send(success(results));
        }
      );
    }
  );

  fastify.post<{ Body: LogBody }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { resident_id, mood, behavior, notes } = request.body;
      const user_id = request.user.id;

      if (!resident_id || !mood || !behavior) {
        return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, mood, and behavior are required'));
      }

      fastify.mysql.query(
        'INSERT INTO daily_logs (resident_id, user_id, mood, behavior, notes) VALUES (?, ?, ?, ?, ?)',
        [resident_id, user_id, mood, behavior, notes],
        (err: Error | null, results: any) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          reply.code(201).send(success({ id: results.insertId }));
        }
      );
    }
  );
};
