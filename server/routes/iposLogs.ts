import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { canAccessHome, getAccessibleHomeIds } from '../utils/homeAccess';
import { adminOnly } from '../middleware/rbac';

interface IdParam { id: string; }

interface ListQuery {
  home_id?: string;
  date?: string;
  status?: string;
  resident_id?: string;
}

interface CommentBody {
  content: string;
  entry_id?: string;
}

export default async (fastify: FastifyInstance): Promise<void> => {

  // â”€â”€ GET /ipos-logs â€” list logs across accessible homes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get<{ Querystring: ListQuery }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const homeIds = await getAccessibleHomeIds(fastify, request.user);
    const { home_id, date, status, resident_id } = request.query;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (homeIds !== null) {
      if (homeIds.length === 0) return reply.send(success([]));
      conditions.push(`il.home_id IN (${homeIds.map(() => '?').join(',')})`);
      values.push(...homeIds);
    }

    if (home_id)     { conditions.push('il.home_id = ?');     values.push(home_id); }
    if (date)        { conditions.push('il.log_date = ?');     values.push(date); }
    if (status)      { conditions.push('il.status = ?');       values.push(status); }
    if (resident_id) { conditions.push('il.resident_id = ?'); values.push(resident_id); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT il.*,
              r.first_name as resident_first, r.last_name as resident_last,
              u.first_name as approver_first, u.last_name as approver_last
       FROM ipos_logs il
       JOIN residents r ON il.resident_id = r.id
       LEFT JOIN users u ON il.approved_by = u.id
       ${where}
       ORDER BY il.log_date DESC`,
      values
    );
    return reply.send(success(rows));
  });

  // â”€â”€ GET /ipos-logs/:id â€” single log with entries and comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get<{ Params: IdParam }>('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [logs] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT il.*, r.home_id FROM ipos_logs il JOIN residents r ON il.resident_id = r.id WHERE il.id = ?',
      [request.params.id]
    );
    if (!logs[0]) return reply.code(404).send(failure('NOT_FOUND', 'Log not found'));

    if (!await canAccessHome(fastify, request.user, logs[0].home_id))
      return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

    const [entries] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT ie.*, u.first_name as staff_first, u.last_name as staff_last,
              rg.code as goal_code, rg.description as goal_description
       FROM ipos_entries ie
       JOIN users u ON ie.user_id = u.id
       LEFT JOIN resident_goals rg ON ie.goal_id = rg.id
       WHERE ie.log_id = ?`,
      [request.params.id]
    );

    const [comments] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT irc.*, u.first_name as commenter_first, u.last_name as commenter_last
       FROM ipos_review_comments irc
       JOIN users u ON irc.user_id = u.id
       WHERE irc.log_id = ?`,
      [request.params.id]
    );

    return reply.send(success({ log: logs[0], entries, comments }));
  });

  // â”€â”€ PATCH /ipos-logs/:id/submit â€” staff submits log for review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: IdParam }>('/:id/submit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [logs] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT id, status FROM ipos_logs WHERE id = ?', [request.params.id]
    );
    if (!logs[0]) return reply.code(404).send(failure('NOT_FOUND', 'Log not found'));

    if (!['draft', 'needs_revision'].includes(logs[0].status))
      return reply.code(403).send(failure('INVALID_STATUS', 'Log cannot be submitted in its current status'));

    const [entries] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT id FROM ipos_entries WHERE log_id = ? AND user_id = ?',
      [request.params.id, request.user.id]
    );
    if (!entries[0]) return reply.code(403).send(failure('NO_ENTRY', 'You have no entries on this log'));

    await fastify.db.execute(
      'UPDATE ipos_logs SET status = ?, submitted_at = NOW() WHERE id = ?',
      ['submitted', request.params.id]
    );
    return reply.send(success({ message: 'Log submitted' }));
  });

  // â”€â”€ PATCH /ipos-logs/:id/approve â€” manager approves log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch<{ Params: IdParam }>(
    '/:id/approve',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const [logs] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT il.*, r.home_id FROM ipos_logs il JOIN residents r ON il.resident_id = r.id WHERE il.id = ?',
        [request.params.id]
      );
      if (!logs[0]) return reply.code(404).send(failure('NOT_FOUND', 'Log not found'));

      if (!await canAccessHome(fastify, request.user, logs[0].home_id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const [diffCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT DATEDIFF(NOW(), ?) as diff', [logs[0].log_date]
      );
      if (diffCheck[0].diff > 7)
        return reply.code(403).send(failure('APPROVAL_WINDOW_CLOSED', 'Approval window has closed for this log'));

      await fastify.db.execute(
        'UPDATE ipos_logs SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
        ['approved', request.user.id, request.params.id]
      );
      return reply.send(success({ message: 'Log approved' }));
    }
  );

  // â”€â”€ POST /ipos-logs/:id/comments â€” add review comment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post<{ Params: IdParam; Body: CommentBody }>(
    '/:id/comments',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { content, entry_id } = request.body;

      if (!content)
        return reply.code(400).send(failure('MISSING_FIELDS', 'content is required'));

      const [logs] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT il.*, r.home_id FROM ipos_logs il JOIN residents r ON il.resident_id = r.id WHERE il.id = ?',
        [request.params.id]
      );
      if (!logs[0]) return reply.code(404).send(failure('NOT_FOUND', 'Log not found'));

      if (!await canAccessHome(fastify, request.user, logs[0].home_id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO ipos_review_comments (id, log_id, user_id, entry_id, content) VALUES (?, ?, ?, ?, ?)',
        [id, request.params.id, request.user.id, entry_id ?? null, content]
      );
      await fastify.db.execute(
        'UPDATE ipos_logs SET status = ? WHERE id = ?',
        ['needs_revision', request.params.id]
      );
      return reply.code(201).send(success({ id }));
    }
  );
};
