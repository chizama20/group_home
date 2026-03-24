import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { getAccessibleHomeIds, homeFilter, canAccessHome } from '../utils/homeAccess';
import { ShiftNote } from '../types';

type ShiftNoteBody = Omit<ShiftNote, 'id' | 'organization_id' | 'user_id' | 'created_at'>;

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const homeIds = await getAccessibleHomeIds(fastify, request.user);
    const filter  = homeFilter(homeIds);

    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      `SELECT sn.*, u.name as staff_name, h.name as home_name
       FROM shift_notes sn
       JOIN users u ON sn.user_id = u.id
       JOIN homes h ON sn.home_id = h.id
       WHERE sn.organization_id = ?${filter}
       ORDER BY sn.created_at DESC`,
      homeIds === null ? [organizationId] : [organizationId, ...homeIds]
    );
    return reply.send(success(rows));
  });

  fastify.post<{ Body: ShiftNoteBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId, id: user_id } = request.user;
    const { home_id, shift, content, flagged } = request.body;

    if (!home_id || !shift || !content)
      return reply.code(400).send(failure('MISSING_FIELDS', 'home_id, shift, and content are required'));

    if (!await canAccessHome(fastify, request.user, home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

    const [result] = await fastify.mysql.query<ResultSetHeader>(
      'INSERT INTO shift_notes (organization_id, home_id, user_id, shift, content, flagged) VALUES (?, ?, ?, ?, ?, ?)',
      [organizationId, home_id, user_id, shift, content, flagged ?? false]
    );
    return reply.code(201).send(success({ id: result.insertId }));
  });
};
