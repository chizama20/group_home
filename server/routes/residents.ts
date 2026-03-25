import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { getAccessibleHomeIds, homeFilter, canAccessHome } from '../utils/homeAccess';

interface ResidentBody {
  home_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  room?: string;
  diagnosis?: string;
  physician?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_relation?: string;
  notes?: string;
}
interface IdParam { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const homeIds = await getAccessibleHomeIds(fastify, request.user);
    const filter  = homeFilter(homeIds);

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT r.*, h.name as home_name
       FROM residents r
       JOIN homes h ON r.home_id = h.id
       WHERE r.is_active = 1${filter}
       ORDER BY r.last_name, r.first_name`,
      homeIds === null ? [] : homeIds
    );
    return reply.send(success(rows));
  });

  fastify.get<{ Params: IdParam }>('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT * FROM residents WHERE id = ?',
      [request.params.id]
    );
    if (!rows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

    if (!await canAccessHome(fastify, request.user, rows[0].home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

    return reply.send(success(rows[0]));
  });

  fastify.post<{ Body: ResidentBody }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id: created_by } = request.user;
    const {
      home_id, first_name, last_name, date_of_birth,
      room, diagnosis, physician,
      primary_contact_name, primary_contact_phone, primary_contact_relation, notes
    } = request.body;

    if (!first_name || !last_name || !date_of_birth || !home_id)
      return reply.code(400).send(failure('MISSING_FIELDS', 'first_name, last_name, date_of_birth, and home_id are required'));

    if (!await canAccessHome(fastify, request.user, home_id))
      return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

    const id = uuidv4();
    await fastify.db.execute(
      `INSERT INTO residents
       (id, home_id, first_name, last_name, date_of_birth, room, diagnosis, physician,
        primary_contact_name, primary_contact_phone, primary_contact_relation, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, home_id, first_name, last_name, date_of_birth,
       room ?? null, diagnosis ?? null, physician ?? null,
       primary_contact_name ?? null, primary_contact_phone ?? null,
       primary_contact_relation ?? null, notes ?? null, created_by]
    );
    return reply.code(201).send(success({ id }));
  });
};
