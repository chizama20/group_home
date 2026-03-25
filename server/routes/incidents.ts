import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { getAccessibleHomeIds, homeFilter, canAccessHome } from '../utils/homeAccess';

interface IncidentBody {
  resident_id: string;
  home_id: string;
  title: string;
  description: string;
}
interface IdParam { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const homeIds = await getAccessibleHomeIds(fastify, request.user);
    const filter  = homeFilter(homeIds, 'i.home_id');

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT i.*, r.first_name, r.last_name, u.first_name as staff_first, u.last_name as staff_last
       FROM incidents i
       JOIN residents r ON i.resident_id = r.id
       JOIN users u ON i.reported_by = u.id
       WHERE 1=1${filter}
       ORDER BY i.created_at DESC`,
      homeIds === null ? [] : homeIds
    );
    return reply.send(success(rows));
  });

  fastify.post<{ Body: IncidentBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id: reported_by } = request.user;
    const { resident_id, home_id, title, description } = request.body;

    if (!resident_id || !home_id || !title || !description)
      return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, home_id, title, and description are required'));

    if (!await canAccessHome(fastify, request.user, home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

    const id = uuidv4();
    await fastify.db.execute(
      'INSERT INTO incidents (id, resident_id, home_id, reported_by, title, description) VALUES (?, ?, ?, ?, ?, ?)',
      [id, resident_id, home_id, reported_by, title, description]
    );
    return reply.code(201).send(success({ id }));
  });

  fastify.put<{ Params: IdParam }>(
    '/:id/close',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: signed_off_by } = request.user;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM incidents WHERE id = ?', [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Incident not found'));
      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Incident not found'));

      await fastify.db.execute(
        'UPDATE incidents SET status = ?, signed_off_by = ? WHERE id = ?',
        ['closed', signed_off_by, request.params.id]
      );
      return reply.send(success({ message: 'Incident closed' }));
    }
  );
};
