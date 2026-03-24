import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { Medication, MedicationLog } from '../types';

type MedicationBody = Omit<Medication, 'id' | 'organization_id' | 'resident_id' | 'active' | 'created_at'>;
type AdministerBody = Pick<MedicationLog, 'status' | 'notes'>;
interface ResidentIdParam { id: string; }
interface MedIdParam     { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get<{ Params: ResidentIdParam }>(
    '/residents/:id/medications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { organizationId } = request.user;
      // Verify resident belongs to org
      const [check] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM residents WHERE id = ? AND organization_id = ?', [request.params.id, organizationId]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT * FROM medications WHERE resident_id = ? AND organization_id = ? AND active = 1',
        [request.params.id, organizationId]
      );
      return reply.send(success(rows));
    }
  );

  fastify.post<{ Params: ResidentIdParam; Body: MedicationBody }>(
    '/residents/:id/medications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { name, dosage, frequency, instructions } = request.body;

      if (!name || !dosage || !frequency)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name, dosage, and frequency are required'));

      const [check] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM residents WHERE id = ? AND organization_id = ?', [request.params.id, organizationId]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [result] = await fastify.mysql.query<ResultSetHeader>(
        'INSERT INTO medications (organization_id, resident_id, name, dosage, frequency, instructions) VALUES (?, ?, ?, ?, ?, ?)',
        [organizationId, request.params.id, name, dosage, frequency, instructions ?? null]
      );
      return reply.code(201).send(success({ id: result.insertId }));
    }
  );

  fastify.post<{ Params: MedIdParam; Body: AdministerBody }>(
    '/:id/administer',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { organizationId, id: user_id } = request.user;
      const { status, notes } = request.body;

      if (!status)
        return reply.code(400).send(failure('MISSING_FIELDS', 'status is required'));

      // Verify medication belongs to this org via its resident
      const [check] = await fastify.mysql.query<RowDataPacket[]>(
        `SELECT m.id FROM medications m
         JOIN residents r ON m.resident_id = r.id
         WHERE m.id = ? AND r.organization_id = ?`,
        [request.params.id, organizationId]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Medication not found'));

      const [result] = await fastify.mysql.query<ResultSetHeader>(
        'INSERT INTO medication_logs (organization_id, medication_id, user_id, status, notes) VALUES (?, ?, ?, ?, ?)',
        [organizationId, request.params.id, user_id, status, notes ?? null]
      );
      return reply.code(201).send(success({ id: result.insertId }));
    }
  );
};
