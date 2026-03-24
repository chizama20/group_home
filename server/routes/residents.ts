import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';

interface ResidentBody {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  room_number?: string;
  notes?: string;
}
interface IdParam { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (_request, reply) => {
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT id, first_name, last_name, room_number, active FROM residents WHERE active = 1'
    );
    return reply.send(success(rows));
  });

  fastify.get<{ Params: IdParam }>('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT * FROM residents WHERE id = ?', [request.params.id]
    );
    if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));
    return reply.send(success(rows[0]));
  });

  fastify.post<{ Body: ResidentBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { first_name, last_name, date_of_birth, room_number, notes } = request.body;

    if (!first_name || !last_name || !date_of_birth)
      return reply.code(400).send(failure('MISSING_FIELDS', 'first_name, last_name, and date_of_birth are required'));

    const [result] = await fastify.mysql.query<ResultSetHeader>(
      'INSERT INTO residents (first_name, last_name, date_of_birth, room_number, notes) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, date_of_birth, room_number ?? null, notes ?? null]
    );
    return reply.code(201).send(success({ id: result.insertId }));
  });
};
