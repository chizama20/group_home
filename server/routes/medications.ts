import { FastifyInstance } from 'fastify';
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
      const { id } = request.params;
      fastify.mysql.query(
        'SELECT * FROM medications WHERE resident_id = ? AND active = 1',
        [id],
        (err: Error | null, results: any[]) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          reply.send(success(results));
        }
      );
    }
  );

  fastify.post<{ Params: ResidentIdParam; Body: MedicationBody }>(
    '/residents/:id/medications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const { name, dosage, frequency, instructions } = request.body;

      if (!name || !dosage || !frequency) {
        return reply.code(400).send(failure('MISSING_FIELDS', 'name, dosage, and frequency are required'));
      }

      fastify.mysql.query(
        'INSERT INTO medications (resident_id, name, dosage, frequency, instructions) VALUES (?, ?, ?, ?, ?)',
        [id, name, dosage, frequency, instructions],
        (err: Error | null, results: any) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          reply.code(201).send(success({ id: results.insertId }));
        }
      );
    }
  );

  fastify.post<{ Params: MedIdParam; Body: AdministerBody }>(
    '/:id/administer',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const { status, notes } = request.body;
      const user_id = request.user.id;

      if (!status) {
        return reply.code(400).send(failure('MISSING_FIELDS', 'status is required'));
      }

      fastify.mysql.query(
        'INSERT INTO medication_logs (medication_id, user_id, status, notes) VALUES (?, ?, ?, ?)',
        [id, user_id, status, notes],
        (err: Error | null, results: any) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          reply.code(201).send(success({ id: results.insertId }));
        }
      );
    }
  );
};
