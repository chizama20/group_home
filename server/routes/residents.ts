import { FastifyInstance } from 'fastify';
import { success, failure } from '../utils/response';

interface ResidentBody {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  room_number?: string;
  notes?: string;
}

interface IdParam {
  id: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (_request, reply) => {
      fastify.mysql.query(
        'SELECT id, first_name, last_name, room_number, active FROM residents WHERE active = 1',
        (err: Error | null, results: any[]) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          reply.send(success(results));
        }
      );
    }
  );

  fastify.get<{ Params: IdParam }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      fastify.mysql.query(
        'SELECT * FROM residents WHERE id = ?',
        [id],
        (err: Error | null, results: any[]) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          if (!results[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));
          reply.send(success(results[0]));
        }
      );
    }
  );

  fastify.post<{ Body: ResidentBody }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { first_name, last_name, date_of_birth, room_number, notes } = request.body;

      if (!first_name || !last_name || !date_of_birth) {
        return reply.code(400).send(failure('MISSING_FIELDS', 'first_name, last_name, and date_of_birth are required'));
      }

      fastify.mysql.query(
        'INSERT INTO residents (first_name, last_name, date_of_birth, room_number, notes) VALUES (?, ?, ?, ?, ?)',
        [first_name, last_name, date_of_birth, room_number, notes],
        (err: Error | null, results: any) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          reply.code(201).send(success({ id: results.insertId }));
        }
      );
    }
  );
};
