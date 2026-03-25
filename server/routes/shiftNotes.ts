import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { getAccessibleHomeIds, homeFilter, canAccessHome } from '../utils/homeAccess';

interface ShiftNoteBody {
  home_id: string;
  resident_id?: string;
  shift: 'morning' | 'afternoon' | 'overnight';
  shift_date: string;
  content: string;
  flagged?: boolean;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const homeIds = await getAccessibleHomeIds(fastify, request.user);
    const filter  = homeFilter(homeIds, 'sn.home_id');

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT sn.*, u.first_name, u.last_name, h.name as home_name
       FROM shift_notes sn
       JOIN users u ON sn.user_id = u.id
       JOIN homes h ON sn.home_id = h.id
       WHERE 1=1${filter}
       ORDER BY sn.shift_date DESC, sn.created_at DESC`,
      homeIds === null ? [] : homeIds
    );
    return reply.send(success(rows));
  });

  fastify.post<{ Body: ShiftNoteBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id: user_id } = request.user;
    const { home_id, resident_id, shift, shift_date, content, flagged } = request.body;

    if (!home_id || !shift || !shift_date || !content)
      return reply.code(400).send(failure('MISSING_FIELDS', 'home_id, shift, shift_date, and content are required'));

    if (!await canAccessHome(fastify, request.user, home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

    const id = uuidv4();
    await fastify.db.execute(
      'INSERT INTO shift_notes (id, home_id, user_id, resident_id, shift, shift_date, content, flagged) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, home_id, user_id, resident_id ?? null, shift, shift_date, content, flagged ?? false]
    );
    return reply.code(201).send(success({ id }));
  });
};
