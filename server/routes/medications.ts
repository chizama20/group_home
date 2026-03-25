import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';

interface MedicationBody {
  name: string;
  dosage: string;
  frequency: string;
  scheduled_time?: string;
  instructions?: string;
}
interface AdministerBody { outcome: 'given' | 'refused' | 'missed' | 'held'; notes?: string; }
interface ResidentIdParam { id: string; }
interface MedIdParam     { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.get<{ Params: ResidentIdParam }>(
    '/residents/:id/medications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ?',
        [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));
      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT * FROM medications WHERE resident_id = ? AND is_active = 1',
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  fastify.post<{ Params: ResidentIdParam; Body: MedicationBody }>(
    '/residents/:id/medications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { name, dosage, frequency, scheduled_time, instructions } = request.body;

      if (!name || !dosage || !frequency)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name, dosage, and frequency are required'));

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ?',
        [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));
      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO medications (id, resident_id, name, dosage, frequency, scheduled_time, instructions) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, request.params.id, name, dosage, frequency, scheduled_time ?? null, instructions ?? null]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  fastify.post<{ Params: MedIdParam; Body: AdministerBody }>(
    '/:id/administer',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: administered_by } = request.user;
      const { outcome, notes } = request.body;

      if (!outcome)
        return reply.code(400).send(failure('MISSING_FIELDS', 'outcome is required'));

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT m.id, m.resident_id, r.home_id FROM medications m
         JOIN residents r ON m.resident_id = r.id
         WHERE m.id = ?`,
        [request.params.id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Medication not found'));
      if (!await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Medication not found'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO medication_logs (id, medication_id, resident_id, administered_by, outcome, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, request.params.id, check[0].resident_id, administered_by, outcome, notes ?? null]
      );
      return reply.code(201).send(success({ id }));
    }
  );
};
