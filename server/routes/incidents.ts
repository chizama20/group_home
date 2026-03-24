import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { Incident } from '../types';

type IncidentBody = Omit<Incident, 'id' | 'user_id' | 'created_at'>;

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (_request, reply) => {
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      `SELECT i.*, r.first_name, r.last_name, u.name as staff_name
       FROM incidents i
       JOIN residents r ON i.resident_id = r.id
       JOIN users u ON i.user_id = u.id
       ORDER BY i.occurred_at DESC`
    );
    return reply.send(success(rows));
  });

  fastify.post<{ Body: IncidentBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { resident_id, severity, type, description, action_taken, reported_to_supervisor, occurred_at } = request.body;

    if (!resident_id || !severity || !type || !description || !occurred_at)
      return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, severity, type, description, and occurred_at are required'));

    const [result] = await fastify.mysql.query<ResultSetHeader>(
      `INSERT INTO incidents
       (resident_id, user_id, severity, type, description, action_taken, reported_to_supervisor, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [resident_id, request.user.id, severity, type, description, action_taken ?? null, reported_to_supervisor ?? false, occurred_at]
    );
    return reply.code(201).send(success({ id: result.insertId }));
  });
};
