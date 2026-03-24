import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { getAccessibleHomeIds, homeFilter, canAccessHome } from '../utils/homeAccess';

interface ResidentBody {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  home_id: number;
  room_number?: string;
  notes?: string;
}
interface IdParam { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const homeIds = await getAccessibleHomeIds(fastify, request.user);
    const filter  = homeFilter(homeIds);

    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      `SELECT r.*, h.name as home_name
       FROM residents r
       JOIN homes h ON r.home_id = h.id
       WHERE r.active = 1 AND r.organization_id = ?${filter}
       ORDER BY r.last_name, r.first_name`,
      homeIds === null ? [organizationId] : [organizationId, ...homeIds]
    );
    return reply.send(success(rows));
  });

  fastify.get<{ Params: IdParam }>('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT * FROM residents WHERE id = ? AND organization_id = ?',
      [request.params.id, organizationId]
    );
    if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

    if (!await canAccessHome(fastify, request.user, rows[0].home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

    return reply.send(success(rows[0]));
  });

  fastify.post<{ Body: ResidentBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const { first_name, last_name, date_of_birth, home_id, room_number, notes } = request.body;

    if (!first_name || !last_name || !date_of_birth || !home_id)
      return reply.code(400).send(failure('MISSING_FIELDS', 'first_name, last_name, date_of_birth, and home_id are required'));

    if (!await canAccessHome(fastify, request.user, home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

    const [result] = await fastify.mysql.query<ResultSetHeader>(
      'INSERT INTO residents (organization_id, home_id, first_name, last_name, date_of_birth, room_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [organizationId, home_id, first_name, last_name, date_of_birth, room_number ?? null, notes ?? null]
    );
    return reply.code(201).send(success({ id: result.insertId }));
  });
};
