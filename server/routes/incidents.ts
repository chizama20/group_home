import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { getAccessibleHomeIds, homeFilter, canAccessHome } from '../utils/homeAccess';
import { Incident } from '../types';

type IncidentBody = Omit<Incident, 'id' | 'organization_id' | 'user_id' | 'created_at'>;

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId } = request.user;
    const homeIds = await getAccessibleHomeIds(fastify, request.user);
    const filter  = homeFilter(homeIds, 'r.home_id');

    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      `SELECT i.*, r.first_name, r.last_name, u.name as staff_name
       FROM incidents i
       JOIN residents r ON i.resident_id = r.id
       JOIN users u ON i.user_id = u.id
       WHERE i.organization_id = ?${filter}
       ORDER BY i.occurred_at DESC`,
      homeIds === null ? [organizationId] : [organizationId, ...homeIds]
    );
    return reply.send(success(rows));
  });

  fastify.post<{ Body: IncidentBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { organizationId, id: user_id } = request.user;
    const { resident_id, severity, type, description, action_taken, reported_to_supervisor, occurred_at } = request.body;

    if (!resident_id || !severity || !type || !description || !occurred_at)
      return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, severity, type, description, and occurred_at are required'));

    const [check] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT id, home_id FROM residents WHERE id = ? AND organization_id = ?',
      [resident_id, organizationId]
    );
    if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));
    if (!await canAccessHome(fastify, request.user, check[0].home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

    const [result] = await fastify.mysql.query<ResultSetHeader>(
      `INSERT INTO incidents
       (organization_id, resident_id, user_id, severity, type, description, action_taken, reported_to_supervisor, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizationId, resident_id, user_id, severity, type, description, action_taken ?? null, reported_to_supervisor ?? false, occurred_at]
    );
    return reply.code(201).send(success({ id: result.insertId }));
  });
};
