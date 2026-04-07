import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';

interface IdParam { id: string; }

interface PatchBody {
  task_id_code?: string;
  cls_minutes?: number;
  pc_minutes?: number;
  progress_code?: string;
  narrative?: string;
  goal_id?: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /ipos-entries/:id — edit own entry ─────────────────────────────
  fastify.patch<{ Params: IdParam; Body: PatchBody }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [entries] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT ie.*, il.log_date FROM ipos_entries ie
         JOIN ipos_logs il ON ie.log_id = il.id
         WHERE ie.id = ?`,
        [request.params.id]
      );
      if (!entries[0]) return reply.code(404).send(failure('NOT_FOUND', 'Entry not found'));

      if (entries[0].user_id !== request.user.id)
        return reply.code(403).send(failure('FORBIDDEN', 'You can only edit your own entries'));

      const [diffCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT DATEDIFF(NOW(), ?) as diff', [entries[0].log_date]
      );
      if (diffCheck[0].diff > 2)
        return reply.code(403).send(failure('EDIT_WINDOW_CLOSED', 'Edit window has closed for this entry'));

      const fields = ['task_id_code', 'cls_minutes', 'pc_minutes', 'progress_code', 'narrative', 'goal_id'] as const;

      const updates: string[] = [];
      const values: (string | number | null)[] = [];
      for (const field of fields) {
        if (request.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(request.body[field] ?? null);
        }
      }

      if (updates.length === 0)
        return reply.code(400).send(failure('MISSING_FIELDS', 'At least one field is required'));

      values.push(request.params.id);
      await fastify.db.execute(`UPDATE ipos_entries SET ${updates.join(', ')} WHERE id = ?`, values);

      return reply.send(success({ message: 'Entry updated' }));
    }
  );
};
