import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { ShiftNote } from '../types';

type ShiftNoteBody = Omit<ShiftNote, 'id' | 'organization_id' | 'user_id' | 'created_at'>;

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      `SELECT sn.*, u.name as staff_name
       FROM shift_notes sn
       JOIN users u ON sn.user_id = u.id
       WHERE sn.organization_id = ?
       ORDER BY sn.created_at DESC`,
      [organizationId]
    );
    return reply.send(success(rows));
  });

  fastify.post<{ Body: ShiftNoteBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId, id: user_id } = request.user;
    const { shift, content, flagged } = request.body;

    if (!shift || !content)
      return reply.code(400).send(failure('MISSING_FIELDS', 'shift and content are required'));

    const [result] = await fastify.mysql.query<ResultSetHeader>(
      'INSERT INTO shift_notes (organization_id, user_id, shift, content, flagged) VALUES (?, ?, ?, ?, ?)',
      [organizationId, user_id, shift, content, flagged ?? false]
    );
    return reply.code(201).send(success({ id: result.insertId }));
  });
};
