import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { canAccessHome } from '../utils/homeAccess';
import { managerOrAbove } from '../middleware/rbac';

interface IdParam { id: string; }
interface PatchBody {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  is_emergency_contact?: boolean;
  notify_on_incident?: boolean;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /contacts/:id — update contact (manager+) ──────────────────────
  fastify.patch<{ Params: IdParam; Body: PatchBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const [contact] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, resident_id FROM resident_contacts WHERE id = ? AND is_active = 1',
        [request.params.id]
      );
      if (!contact[0]) return reply.code(404).send(failure('NOT_FOUND', 'Contact not found'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1',
        [contact[0].resident_id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Contact not found'));

      const fields = ['name', 'relationship', 'phone', 'email', 'is_emergency_contact', 'notify_on_incident'] as const;

      const updates: string[] = [];
      const values: (string | number | boolean | null)[] = [];
      for (const field of fields) {
        if (request.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          if (field === 'is_emergency_contact' || field === 'notify_on_incident') {
            values.push(request.body[field] ? 1 : 0);
          } else {
            values.push((request.body[field] as string | null) ?? null);
          }
        }
      }

      if (updates.length === 0)
        return reply.code(400).send(failure('MISSING_FIELDS', 'At least one field is required'));

      values.push(request.params.id);
      await fastify.db.execute(
        `UPDATE resident_contacts SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      return reply.send(success({ message: 'Contact updated' }));
    }
  );

  // ── DELETE /contacts/:id — soft delete contact (manager+) ────────────────
  fastify.delete<{ Params: IdParam }>(
    '/:id',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const [contact] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, resident_id FROM resident_contacts WHERE id = ? AND is_active = 1',
        [request.params.id]
      );
      if (!contact[0]) return reply.code(404).send(failure('NOT_FOUND', 'Contact not found'));

      const [resident] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, home_id FROM residents WHERE id = ? AND is_active = 1',
        [contact[0].resident_id]
      );
      if (!resident[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found'));

      if (!await canAccessHome(fastify, request.user, resident[0].home_id))
        return reply.code(404).send(failure('NOT_FOUND', 'Contact not found'));

      await fastify.db.execute(
        'UPDATE resident_contacts SET is_active = 0 WHERE id = ?',
        [request.params.id]
      );
      return reply.send(success({ message: 'Contact removed' }));
    }
  );
};
