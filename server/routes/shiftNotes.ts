import { FastifyInstance } from 'fastify';
import { success, failure } from '../utils/response';
import { ShiftNote } from '../types';

type ShiftNoteBody = Omit<ShiftNote, 'id' | 'user_id' | 'created_at'>;

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (_request, reply) => {
      fastify.mysql.query(
        `SELECT sn.*, u.name as staff_name
         FROM shift_notes sn
         JOIN users u ON sn.user_id = u.id
         ORDER BY sn.created_at DESC`,
        (err: Error | null, results: any[]) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          reply.send(success(results));
        }
      );
    }
  );

  fastify.post<{ Body: ShiftNoteBody }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { shift, content, flagged } = request.body;
      const user_id = request.user.id;

      if (!shift || !content) {
        return reply.code(400).send(failure('MISSING_FIELDS', 'shift and content are required'));
      }

      fastify.mysql.query(
        'INSERT INTO shift_notes (user_id, shift, content, flagged) VALUES (?, ?, ?, ?)',
        [user_id, shift, content, flagged ?? false],
        (err: Error | null, results: any) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          reply.code(201).send(success({ id: results.insertId }));
        }
      );
    }
  );
};
