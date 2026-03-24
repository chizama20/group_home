import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { success, failure } from '../utils/response';
import { Medication, MedicationLog } from '../types';

type MedicationBody = Omit<Medication, 'id' | 'resident_id' | 'active' | 'created_at'>;
type AdministerBody = Pick<MedicationLog, 'status' | 'notes'>;
interface ResidentIdParam { id: string; }
interface MedIdParam     { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get<{ Params: ResidentIdParam }>(
    '/residents/:id/medications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [rows] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT * FROM medications WHERE resident_id = ? AND active = 1', [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  fastify.post<{ Params: ResidentIdParam; Body: MedicationBody }>(
    '/residents/:id/medications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { name, dosage, frequency, instructions } = request.body;

      if (!name || !dosage || !frequency)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name, dosage, and frequency are required'));

      const [result] = await fastify.mysql.query<ResultSetHeader>(
        'INSERT INTO medications (resident_id, name, dosage, frequency, instructions) VALUES (?, ?, ?, ?, ?)',
        [request.params.id, name, dosage, frequency, instructions ?? null]
      );
      return reply.code(201).send(success({ id: result.insertId }));
    }
  );

  fastify.post<{ Params: MedIdParam; Body: AdministerBody }>(
    '/:id/administer',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { status, notes } = request.body;

      if (!status)
        return reply.code(400).send(failure('MISSING_FIELDS', 'status is required'));

      const [result] = await fastify.mysql.query<ResultSetHeader>(
        'INSERT INTO medication_logs (medication_id, user_id, status, notes) VALUES (?, ?, ?, ?)',
        [request.params.id, request.user.id, status, notes ?? null]
      );
      return reply.code(201).send(success({ id: result.insertId }));
    }
  );
};
