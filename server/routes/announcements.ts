import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { success, failure } from '../utils/response';
import { managerOrAbove } from '../middleware/rbac';
import { canAccessHome } from '../utils/homeAccess';

interface IdParam { id: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── PATCH /announcements/:id/pin — toggle is_pinned (manager+) ──────────────
  fastify.patch<{ Params: IdParam }>(
    '/:id/pin',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT a.id, a.home_id, a.is_pinned FROM announcements a
         JOIN orgs o ON a.org_id = o.id
         WHERE a.id = ? AND a.org_id = (SELECT id FROM orgs WHERE id = ?)`,
        [request.params.id, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Announcement not found'));

      if (check[0].home_id && !await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const newPinned = check[0].is_pinned ? 0 : 1;
      await fastify.db.execute(
        'UPDATE announcements SET is_pinned = ? WHERE id = ?',
        [newPinned, request.params.id]
      );
      return reply.send(success({ is_pinned: Boolean(newPinned) }));
    }
  );

  // ── DELETE /announcements/:id — hard delete (manager+) ──────────────────────
  fastify.delete<{ Params: IdParam }>(
    '/:id',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT a.id, a.home_id FROM announcements a
         WHERE a.id = ? AND a.org_id = ?`,
        [request.params.id, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Announcement not found'));

      if (check[0].home_id && !await canAccessHome(fastify, request.user, check[0].home_id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      await fastify.db.execute('DELETE FROM announcements WHERE id = ?', [request.params.id]);
      return reply.send(success({ message: 'Announcement deleted' }));
    }
  );
};
