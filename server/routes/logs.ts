import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { getAccessibleHomeIds, homeFilter, canAccessHome } from '../utils/homeAccess';

interface IposLogBody {
  resident_id: string;
  home_id: string;
  shift: 'morning' | 'afternoon' | 'overnight';
  log_date: string;
  content: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const homeIds = await getAccessibleHomeIds(fastify, request.user);
    const filter  = homeFilter(homeIds, 'il.home_id');

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT il.*, r.first_name, r.last_name, u.first_name as staff_first, u.last_name as staff_last
       FROM ipos_logs il
       JOIN residents r ON il.resident_id = r.id
       JOIN users u ON il.user_id = u.id
       WHERE 1=1${filter}
       ORDER BY il.log_date DESC`,
      homeIds === null ? [] : homeIds
    );
    return reply.send(success(rows));
  });

  fastify.post<{ Body: IposLogBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id: user_id } = request.user;
    const { resident_id, home_id, shift, log_date, content } = request.body;

    if (!resident_id || !home_id || !shift || !log_date || !content)
      return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, home_id, shift, log_date, and content are required'));

    if (!await canAccessHome(fastify, request.user, home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

    const id = uuidv4();
    await fastify.db.execute(
      'INSERT INTO ipos_logs (id, resident_id, home_id, user_id, shift, log_date, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, resident_id, home_id, user_id, shift, log_date, content]
    );
    return reply.code(201).send(success({ id }));
  });
};
