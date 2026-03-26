import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { orgAdminOnly, managerOrAbove } from '../middleware/rbac';
import { canAccessHome } from '../utils/homeAccess';

interface HomeBody   { name: string; address?: string; }
interface HomeParam  { id: string; }
interface StaffParam { id: string; userId: string; }
interface AssignBody { userId: string; }
interface ResidentBody {
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

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── GET /homes — list homes the user is assigned to (manager+) ────────────
  fastify.get('/', { preHandler: [fastify.authenticate, managerOrAbove] }, async (request, reply) => {
    const { org_id, id: userId, role } = request.user;

    let rows: RowDataPacket[];
    if (role === 'org_admin') {
      [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT * FROM homes WHERE org_id = ? AND is_active = 1 ORDER BY name', [org_id]
      );
    } else {
      [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT h.* FROM homes h
         JOIN home_staff hs ON h.id = hs.home_id
         WHERE hs.user_id = ? AND h.org_id = ? AND h.is_active = 1
         ORDER BY h.name`,
        [userId, org_id]
      );
    }
    return reply.send(success(rows));
  });

  // ── POST /homes — create home (org_admin) ─────────────────────────────────
  fastify.post<{ Body: HomeBody }>(
    '/',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { name, address } = request.body;

      if (!name)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name is required'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO homes (id, org_id, name, address) VALUES (?, ?, ?, ?)',
        [id, org_id, name, address ?? null]
      );
      return reply.code(201).send(success({ id, name }));
    }
  );

  // ── PATCH /homes/:id — edit home name/address (org_admin) ─────────────────
  fastify.patch<{ Params: HomeParam; Body: HomeBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { name, address } = request.body;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      await fastify.db.execute(
        'UPDATE homes SET name = ?, address = ? WHERE id = ?',
        [name, address ?? null, request.params.id]
      );
      return reply.send(success({ message: 'Home updated' }));
    }
  );

  // ── PATCH /homes/:id/archive — set is_active=0 (org_admin) ───────────────
  fastify.patch<{ Params: HomeParam }>(
    '/:id/archive',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      await fastify.db.execute('UPDATE homes SET is_active = 0 WHERE id = ?', [request.params.id]);
      return reply.send(success({ message: 'Home archived' }));
    }
  );

  // ── GET /homes/:id/staff — list staff in home (manager+) ──────────────────
  fastify.get<{ Params: HomeParam }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;

      const [check] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!check[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role
         FROM users u
         JOIN home_staff hs ON u.id = hs.user_id
         WHERE hs.home_id = ? AND u.is_active = 1
         ORDER BY u.last_name, u.first_name`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /homes/:id/staff — add user to home (manager+) ───────────────────
  fastify.post<{ Params: HomeParam; Body: AssignBody }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id, id: addedBy } = request.user;
      const { userId } = request.body;

      if (!userId)
        return reply.code(400).send(failure('MISSING_FIELDS', 'userId is required'));

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const [userCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ? AND org_id = ?', [userId, org_id]
      );
      if (!userCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT IGNORE INTO home_staff (id, home_id, user_id, added_by) VALUES (?, ?, ?, ?)',
        [id, request.params.id, userId, addedBy]
      );
      return reply.send(success({ message: 'User added to home' }));
    }
  );

  // ── DELETE /homes/:id/staff/:userId — remove user from home (manager+) ────
  fastify.delete<{ Params: StaffParam }>(
    '/:id/staff/:userId',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { id: homeId, userId } = request.params;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      await fastify.db.execute(
        'DELETE FROM home_staff WHERE home_id = ? AND user_id = ?', [homeId, userId]
      );
      return reply.send(success({ message: 'User removed from home' }));
    }
  );

  // ── GET /homes/:id/residents — list active residents (all roles) ──────────
  // Sorted: open incidents (urgent) first, then all good, then by name
  fastify.get<{ Params: HomeParam }>(
    '/:id/residents',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { org_id } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      if (!await canAccessHome(fastify, request.user, request.params.id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT r.*,
           CASE
             WHEN (SELECT COUNT(*) FROM incidents i WHERE i.resident_id = r.id AND i.status = 'open') > 0
               THEN 'urgent'
             ELSE 'all_good'
           END AS status
         FROM residents r
         WHERE r.home_id = ? AND r.is_active = 1
         ORDER BY
           CASE
             WHEN (SELECT COUNT(*) FROM incidents i WHERE i.resident_id = r.id AND i.status = 'open') > 0
               THEN 0
             ELSE 1
           END,
           r.last_name, r.first_name`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ── POST /homes/:id/residents — create resident (manager+) ────────────────
  fastify.post<{ Params: HomeParam; Body: ResidentBody }>(
    '/:id/residents',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { id: created_by, org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const {
        first_name, last_name, date_of_birth,
        room, diagnosis, physician,
        primary_contact_name, primary_contact_phone, primary_contact_relation, notes
      } = request.body;

      if (!first_name || !last_name || !date_of_birth)
        return reply.code(400).send(failure('MISSING_FIELDS', 'first_name, last_name, and date_of_birth are required'));

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO residents
         (id, home_id, first_name, last_name, date_of_birth, room, diagnosis, physician,
          primary_contact_name, primary_contact_phone, primary_contact_relation, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, homeId, first_name, last_name, date_of_birth,
         room ?? null, diagnosis ?? null, physician ?? null,
         primary_contact_name ?? null, primary_contact_phone ?? null,
         primary_contact_relation ?? null, notes ?? null, created_by]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ── GET /homes/:id/medications — all active meds grouped by scheduled_time ─
  fastify.get<{ Params: HomeParam }>(
    '/:id/medications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { org_id } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      if (!await canAccessHome(fastify, request.user, request.params.id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT m.*, r.first_name, r.last_name
         FROM medications m
         JOIN residents r ON m.resident_id = r.id
         WHERE r.home_id = ? AND m.is_active = 1
         ORDER BY m.scheduled_time, r.last_name, r.first_name`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );
};
