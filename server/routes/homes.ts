import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { orgAdminOnly, managerOrAbove } from '../middleware/rbac';
import { canAccessHome } from '../utils/homeAccess';
import { validate, createHomeSchema, createResidentSchema, patchResidentSchema, createMedicationSchema, administerMedSchema, createShiftNoteSchema, createIncidentSchema, createAnnouncementSchema, createTaskSchema, createAppointmentSchema, paginationSchema } from '../schemas';

interface HomeBody   { name: string; address?: string; }
interface HomeParam  { id: string; }
interface StaffParam { id: string; userId: string; }
interface AssignBody { userId: string; }

interface ResidentBody {
  first_name: string; last_name: string; date_of_birth: string;
  room?: string; diagnosis?: string; physician?: string;
  primary_contact_name?: string; primary_contact_phone?: string;
  primary_contact_relation?: string; notes?: string;
}

interface IposBody {
  resident_id: string; shift: 'day' | 'evening' | 'night';
  log_date: string; content: string;
}

interface BehavioralLogBody {
  resident_id: string; behavior_id: string; notes?: string; occurred_at: string;
}

interface IncidentBody {
  resident_id: string; incident_type: string; severity: 'low' | 'medium' | 'high';
  description: string; occurred_at: string;
}

interface ShiftNoteBody {
  resident_id?: string; shift: 'day' | 'evening' | 'night';
  shift_date: string; content: string; flagged?: boolean;
}

interface AnnouncementQuery { home_id?: string; }

interface AppointmentBody {
  resident_id: string; type: string; title: string;
  appointment_date: string; appointment_time?: string;
  location?: string; notes?: string;
  collector_name?: string; collector_phone?: string;
}

interface AppointmentQuery { from?: string; days?: string; }

interface TaskBody { title: string; description?: string; due_date?: string; }

interface RosterBody { user_id: string; shift: 'day' | 'evening' | 'night'; shift_date: string; }
interface ClockBody  { shift: 'day' | 'evening' | 'night'; shift_date: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
         WHERE hs.user_id = ? AND h.org_id = ? AND h.is_active = 1 ORDER BY h.name`,
        [userId, org_id]
      );
    }
    return reply.send(success(rows));
  });

  fastify.post<{ Body: HomeBody }>(
    '/',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const parsed = validate(createHomeSchema, request.body);
      if (!parsed.success) return reply.code(400).send(failure('VALIDATION_ERROR', parsed.message));
      const { org_id } = request.user;
      const { name, address } = parsed.data;
      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO homes (id, org_id, name, address) VALUES (?, ?, ?, ?)',
        [id, org_id, name, address ?? null]
      );
      return reply.code(201).send(success({ id, name }));
    }
  );

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

  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF
  // ═══════════════════════════════════════════════════════════════════════════

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
         FROM users u JOIN home_staff hs ON u.id = hs.user_id
         WHERE hs.home_id = ? AND u.is_active = 1 ORDER BY u.last_name, u.first_name`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  fastify.post<{ Params: HomeParam; Body: AssignBody }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id, id: addedBy } = request.user;
      const { userId } = request.body;
      if (!userId) return reply.code(400).send(failure('MISSING_FIELDS', 'userId is required'));
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RESIDENTS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam; Querystring: { page?: string; limit?: string; search?: string } }>(
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

      const pg = paginationSchema.parse(request.query);
      const offset = (pg.page - 1) * pg.limit;

      const conditions: string[] = ['r.home_id = ?', 'r.is_active = 1'];
      const values: (string | number)[] = [request.params.id];

      if (pg.search) {
        conditions.push(`(r.first_name LIKE ? OR r.last_name LIKE ? OR r.room LIKE ?)`);
        const like = `%${pg.search}%`;
        values.push(like, like, like);
      }

      const where = conditions.join(' AND ');

      const [[{ total }]] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM residents r WHERE ${where}`, values
      );

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT r.*,
           CASE WHEN COUNT(i.id) > 0 THEN 'urgent' ELSE 'all_good' END AS status
         FROM residents r
         LEFT JOIN incidents i ON i.resident_id = r.id AND i.status = 'open'
         WHERE ${where}
         GROUP BY r.id
         ORDER BY
           CASE WHEN COUNT(i.id) > 0 THEN 0 ELSE 1 END,
           r.last_name, r.first_name
         LIMIT ? OFFSET ?`,
        [...values, Number(pg.limit), Number(offset)]
      );

      return reply.send(success(rows, { total: Number(total), page: pg.page, limit: pg.limit, pages: Math.ceil(Number(total) / pg.limit) }));
    }
  );

  fastify.post<{ Params: HomeParam; Body: ResidentBody }>(
    '/:id/residents',
    { preHandler: [fastify.authenticate, orgAdminOnly] },
    async (request, reply) => {
      const { id: created_by, org_id } = request.user;
      const homeId = request.params.id;
      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const parsedResident = validate(createResidentSchema, request.body);
      if (!parsedResident.success) return reply.code(400).send(failure('VALIDATION_ERROR', parsedResident.message));

      const {
        first_name, last_name, date_of_birth, room, diagnosis, physician,
        primary_contact_name, primary_contact_phone, primary_contact_relation, notes
      } = parsedResident.data;

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

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

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
         FROM medications m JOIN residents r ON m.resident_id = r.id
         WHERE r.home_id = ? AND m.is_active = 1
         ORDER BY m.scheduled_time, r.last_name, r.first_name`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // IPOS LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam; Querystring: { date?: string; shift?: string } }>(
    '/:id/ipos',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { org_id } = request.user;
      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, request.params.id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { date, shift } = request.query;
      const filters: string[] = ['il.home_id = ?'];
      const values: string[] = [request.params.id];
      if (date)  { filters.push('il.log_date = ?');  values.push(date); }
      if (shift) { filters.push('il.shift = ?');     values.push(shift); }

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT il.*, r.first_name, r.last_name, u.first_name as staff_first, u.last_name as staff_last
         FROM ipos_logs il
         JOIN residents r ON il.resident_id = r.id
         JOIN users u ON il.user_id = u.id
         WHERE ${filters.join(' AND ')}
         ORDER BY il.log_date DESC, il.shift`,
        values
      );
      return reply.send(success(rows));
    }
  );

  // IPOS compliance summary — filed vs pending per shift (manager+)
  fastify.get<{ Params: HomeParam; Querystring: { date?: string } }>(
    '/:id/ipos/compliance',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const date = request.query.date ?? new Date().toISOString().split('T')[0];

      const [residents] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, first_name, last_name FROM residents WHERE home_id = ? AND is_active = 1',
        [homeId]
      );

      const shifts = ['day', 'evening', 'night'] as const;
      const result = await Promise.all(shifts.map(async (shift) => {
        const [filed] = await fastify.db.execute<RowDataPacket[]>(
          'SELECT resident_id FROM ipos_logs WHERE home_id = ? AND log_date = ? AND shift = ?',
          [homeId, date, shift]
        );
        const filedIds = new Set(filed.map((r: RowDataPacket) => r.resident_id));
        const pending  = residents.filter((r: RowDataPacket) => !filedIds.has(r.id));
        return {
          shift,
          total_residents: residents.length,
          filed_count: filed.length,
          pending_residents: pending.map((r: RowDataPacket) => ({
            id: r.id, first_name: r.first_name, last_name: r.last_name,
          })),
        };
      }));

      return reply.send(success(result));
    }
  );

  fastify.post<{ Params: HomeParam; Body: IposBody }>(
    '/:id/ipos',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: user_id, org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { resident_id, shift, log_date, content } = request.body;
      if (!resident_id || !shift || !log_date || !content)
        return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, shift, log_date, and content are required'));

      const VALID_SHIFTS = ['day', 'evening', 'night'];
      if (!VALID_SHIFTS.includes(shift))
        return reply.code(400).send(failure('INVALID_VALUE', 'shift must be day, evening, or night'));

      // Verify resident belongs to this home
      const [resCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM residents WHERE id = ? AND home_id = ?', [resident_id, homeId]
      );
      if (!resCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found in this home'));

      try {
        const id = uuidv4();
        await fastify.db.execute(
          'INSERT INTO ipos_logs (id, resident_id, home_id, user_id, shift, log_date, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, resident_id, homeId, user_id, shift, log_date, content]
        );
        return reply.code(201).send(success({ id }));
      } catch (err: unknown) {
        const e = err as { code?: string };
        if (e.code === 'ER_DUP_ENTRY') {
          return reply.code(409).send(failure('DUPLICATE', 'An IPOS log already exists for this resident, shift, and date'));
        }
        throw err;
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // BEHAVIORAL LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam }>(
    '/:id/behavioral-logs',
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
        `SELECT bl.*, tb.name as behavior_name,
                r.first_name as resident_first, r.last_name as resident_last,
                u.first_name as staff_first, u.last_name as staff_last
         FROM behavioral_logs bl
         JOIN tracked_behaviors tb ON bl.behavior_id = tb.id
         JOIN residents r ON bl.resident_id = r.id
         JOIN users u ON bl.user_id = u.id
         WHERE r.home_id = ?
         ORDER BY bl.occurred_at DESC`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  fastify.post<{ Params: HomeParam; Body: BehavioralLogBody }>(
    '/:id/behavioral-logs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: user_id, org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { resident_id, behavior_id, notes, occurred_at } = request.body;
      if (!resident_id || !behavior_id || !occurred_at)
        return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, behavior_id, and occurred_at are required'));

      // Verify resident belongs to this home
      const [resCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM residents WHERE id = ? AND home_id = ?', [resident_id, homeId]
      );
      if (!resCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found in this home'));

      // Verify behavior_id belongs to this resident
      const [bCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM tracked_behaviors WHERE id = ? AND resident_id = ?', [behavior_id, resident_id]
      );
      if (!bCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Behavior not found for this resident'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO behavioral_logs (id, behavior_id, resident_id, user_id, notes, occurred_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, behavior_id, resident_id, user_id, notes ?? null, occurred_at]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENTS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam; Querystring: { status?: string } }>(
    '/:id/incidents',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { org_id } = request.user;
      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, request.params.id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { status } = request.query;
      const filters: string[] = ['i.home_id = ?'];
      const values: string[] = [request.params.id];
      if (status) { filters.push('i.status = ?'); values.push(status); }

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT i.*, r.first_name as resident_first, r.last_name as resident_last,
                u.first_name as reporter_first, u.last_name as reporter_last
         FROM incidents i
         JOIN residents r ON i.resident_id = r.id
         JOIN users u ON i.reported_by = u.id
         WHERE ${filters.join(' AND ')}
         ORDER BY i.created_at DESC`,
        values
      );
      return reply.send(success(rows));
    }
  );

  fastify.post<{ Params: HomeParam; Body: IncidentBody }>(
    '/:id/incidents',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: reported_by, org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const parsedIncident = validate(createIncidentSchema, request.body);
      if (!parsedIncident.success) return reply.code(400).send(failure('VALIDATION_ERROR', parsedIncident.message));

      const { resident_id, incident_type, severity, description, occurred_at } = parsedIncident.data;

      const [resCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM residents WHERE id = ? AND home_id = ?', [resident_id, homeId]
      );
      if (!resCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found in this home'));

      const title = `${incident_type} — ${severity.charAt(0).toUpperCase() + severity.slice(1)}`;
      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO incidents (id, resident_id, home_id, reported_by, title, description, incident_type, severity, occurred_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
        [id, resident_id, homeId, reported_by, title, description, incident_type, severity, occurred_at]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SHIFT NOTES
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam; Querystring: { shift?: string; date?: string } }>(
    '/:id/shift-notes',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { org_id } = request.user;
      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, request.params.id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { shift, date } = request.query;
      const filters: string[] = ['sn.home_id = ?'];
      const values: string[] = [request.params.id];
      if (shift) { filters.push('sn.shift = ?');      values.push(shift); }
      if (date)  { filters.push('sn.shift_date = ?'); values.push(date); }

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT sn.*, u.first_name, u.last_name,
                r.first_name AS resident_first, r.last_name AS resident_last
         FROM shift_notes sn
         JOIN users u ON sn.user_id = u.id
         LEFT JOIN residents r ON sn.resident_id = r.id
         WHERE ${filters.join(' AND ')}
         ORDER BY sn.shift_date DESC, sn.created_at DESC`,
        values
      );
      return reply.send(success(rows));
    }
  );

  // All roles can post shift notes
  fastify.post<{ Params: HomeParam; Body: ShiftNoteBody }>(
    '/:id/shift-notes',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: user_id, org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const parsedNote = validate(createShiftNoteSchema, { ...request.body, home_id: homeId });
      if (!parsedNote.success) return reply.code(400).send(failure('VALIDATION_ERROR', parsedNote.message));

      const { resident_id, shift, shift_date, content, flagged } = parsedNote.data;

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO shift_notes (id, home_id, user_id, resident_id, shift, shift_date, content, flagged) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, homeId, user_id, resident_id ?? null, shift, shift_date, content, flagged ?? false]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ANNOUNCEMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Returns home-specific AND org-wide (home_id IS NULL) announcements
  fastify.get<{ Params: HomeParam }>(
    '/:id/announcements',
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
        `SELECT a.*, u.first_name as poster_first, u.last_name as poster_last
         FROM announcements a JOIN users u ON a.posted_by = u.id
         WHERE a.org_id = ? AND (a.home_id = ? OR a.home_id IS NULL)
         ORDER BY a.is_pinned DESC, a.created_at DESC`,
        [org_id, request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // APPOINTMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam; Querystring: AppointmentQuery }>(
    '/:id/appointments',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { org_id } = request.user;
      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, request.params.id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { from, days } = request.query;
      const filters: string[] = ['a.home_id = ?'];
      const values: (string | number)[] = [request.params.id];

      if (from === 'today') {
        const numDays = days ? parseInt(days, 10) : 1;
        filters.push('a.appointment_date >= CURDATE()');
        filters.push(`a.appointment_date < DATE_ADD(CURDATE(), INTERVAL ? DAY)`);
        values.push(numDays);
      }

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT a.*, r.first_name as resident_first, r.last_name as resident_last,
                u.first_name as scheduled_by_first, u.last_name as scheduled_by_last
         FROM appointments a
         JOIN residents r ON a.resident_id = r.id
         JOIN users u ON a.scheduled_by = u.id
         WHERE ${filters.join(' AND ')}
         ORDER BY a.appointment_date, a.appointment_time`,
        values
      );
      return reply.send(success(rows));
    }
  );

  fastify.post<{ Params: HomeParam; Body: AppointmentBody }>(
    '/:id/appointments',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: scheduled_by, org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { resident_id, type, title, appointment_date, appointment_time, location, notes, collector_name, collector_phone } = request.body;
      if (!resident_id || !type || !title || !appointment_date)
        return reply.code(400).send(failure('MISSING_FIELDS', 'resident_id, type, title, and appointment_date are required'));

      const [resCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM residents WHERE id = ? AND home_id = ?', [resident_id, homeId]
      );
      if (!resCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Resident not found in this home'));

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO appointments
         (id, resident_id, home_id, scheduled_by, type, title, appointment_date, appointment_time, location, notes, collector_name, collector_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, resident_id, homeId, scheduled_by, type, title, appointment_date,
         appointment_time ?? null, location ?? null, notes ?? null,
         collector_name ?? null, collector_phone ?? null]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam }>(
    '/:id/tasks',
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
        `SELECT t.*, u.first_name as created_by_first, u.last_name as created_by_last
         FROM tasks t JOIN users u ON t.created_by = u.id
         WHERE t.home_id = ? AND t.completed_at IS NULL
         ORDER BY t.due_date, t.created_at`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  fastify.post<{ Params: HomeParam; Body: TaskBody }>(
    '/:id/tasks',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { id: created_by, org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const { title, description, due_date } = request.body;
      if (!title) return reply.code(400).send(failure('MISSING_FIELDS', 'title is required'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO tasks (id, home_id, created_by, title, description, due_date) VALUES (?, ?, ?, ?, ?, ?)',
        [id, homeId, created_by, title, description ?? null, due_date ?? null]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ROSTER
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam }>(
    '/:id/roster',
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
        `SELECT sr.*, u.first_name, u.last_name, u.role
         FROM shift_roster sr JOIN users u ON sr.user_id = u.id
         WHERE sr.home_id = ? AND sr.shift_date = CURDATE()
         ORDER BY sr.shift, u.last_name`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // Add staff to shift — emergency override (manager+)
  fastify.post<{ Params: HomeParam; Body: RosterBody }>(
    '/:id/roster',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const { user_id, shift, shift_date } = request.body;
      if (!user_id || !shift || !shift_date)
        return reply.code(400).send(failure('MISSING_FIELDS', 'user_id, shift, and shift_date are required'));

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT IGNORE INTO shift_roster (id, home_id, user_id, shift, shift_date) VALUES (?, ?, ?, ?, ?)`,
        [id, homeId, user_id, shift, shift_date]
      );
      return reply.code(201).send(success({ message: 'Staff added to roster' }));
    }
  );

  // Remove a roster entry — manager override (manager+)
  fastify.delete<{ Params: { id: string; entryId: string } }>(
    '/:id/roster/:entryId',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { org_id } = request.user;
      const { id: homeId, entryId } = request.params;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const [entryCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM shift_roster WHERE id = ? AND home_id = ?', [entryId, homeId]
      );
      if (!entryCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Roster entry not found'));

      await fastify.db.execute('DELETE FROM shift_roster WHERE id = ?', [entryId]);
      return reply.send(success({ message: 'Roster entry removed' }));
    }
  );

  // Clock in — sets clocked_in_at for current user (employee+)
  fastify.post<{ Params: HomeParam; Body: ClockBody }>(
    '/:id/roster/clockin',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: user_id, org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const { shift, shift_date } = request.body;
      if (!shift || !shift_date)
        return reply.code(400).send(failure('MISSING_FIELDS', 'shift and shift_date are required'));

      // Upsert: create row if not exists, then set clocked_in_at
      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO shift_roster (id, home_id, user_id, shift, shift_date, clocked_in_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE clocked_in_at = NOW()`,
        [id, homeId, user_id, shift, shift_date]
      );
      return reply.send(success({ message: 'Clocked in' }));
    }
  );

  // Clock out — sets clocked_out_at for current user (employee+)
  fastify.post<{ Params: HomeParam; Body: ClockBody }>(
    '/:id/roster/clockout',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: user_id, org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));

      const { shift, shift_date } = request.body;
      if (!shift || !shift_date)
        return reply.code(400).send(failure('MISSING_FIELDS', 'shift and shift_date are required'));

      const [rosterCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM shift_roster WHERE home_id = ? AND user_id = ? AND shift = ? AND shift_date = ?',
        [homeId, user_id, shift, shift_date]
      );
      if (!rosterCheck[0])
        return reply.code(404).send(failure('NOT_FOUND', 'No roster entry found — clock in first'));

      await fastify.db.execute(
        'UPDATE shift_roster SET clocked_out_at = NOW() WHERE home_id = ? AND user_id = ? AND shift = ? AND shift_date = ?',
        [homeId, user_id, shift, shift_date]
      );
      return reply.send(success({ message: 'Clocked out' }));
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD — single-call aggregate for the home dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam; Querystring: { shift?: string; date?: string } }>(
    '/:id/dashboard',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { org_id } = request.user;
      const homeId = request.params.id;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { shift, date } = request.query;
      const today = date ?? new Date().toISOString().slice(0, 10);

      const [
        [announcements],
        [residents],
        [medications],
        [iposLogs],
        [appointments],
        [tasks],
        [roster],
        [incidents],
      ] = await Promise.all([
        fastify.db.execute<RowDataPacket[]>(
          `SELECT a.*, u.first_name as poster_first, u.last_name as poster_last
           FROM announcements a JOIN users u ON a.posted_by = u.id
           WHERE a.org_id = ? AND (a.home_id = ? OR a.home_id IS NULL)
           ORDER BY a.is_pinned DESC, a.created_at DESC LIMIT 10`,
          [org_id, homeId]
        ),
        fastify.db.execute<RowDataPacket[]>(
          `SELECT id, first_name, last_name, room, is_active FROM residents WHERE home_id = ? AND is_active = 1`,
          [homeId]
        ),
        fastify.db.execute<RowDataPacket[]>(
          `SELECT m.id, m.scheduled_time, m.is_active FROM medications m
           JOIN residents r ON m.resident_id = r.id
           WHERE r.home_id = ? AND m.is_active = 1`,
          [homeId]
        ),
        fastify.db.execute<RowDataPacket[]>(
          `SELECT il.resident_id FROM ipos_logs il
           WHERE il.home_id = ? AND il.log_date = ?${shift ? ' AND il.shift = ?' : ''}`,
          shift ? [homeId, today, shift] : [homeId, today]
        ),
        fastify.db.execute<RowDataPacket[]>(
          `SELECT a.*, u.first_name as scheduled_by_first, u.last_name as scheduled_by_last,
                  r.first_name as resident_first, r.last_name as resident_last
           FROM appointments a
           JOIN users u ON a.scheduled_by = u.id
           JOIN residents r ON a.resident_id = r.id
           WHERE a.home_id = ? AND a.appointment_date >= CURDATE() AND a.appointment_date < DATE_ADD(CURDATE(), INTERVAL 3 DAY)
           ORDER BY a.appointment_date, a.appointment_time LIMIT 10`,
          [homeId]
        ),
        fastify.db.execute<RowDataPacket[]>(
          `SELECT t.id, t.home_id, t.title, t.description, t.due_date, t.status,
                  t.claimed_by, t.claimed_at, t.completed_at, t.created_at
           FROM tasks t
           WHERE t.home_id = ? AND t.status != 'completed'
           ORDER BY t.due_date ASC LIMIT 20`,
          [homeId]
        ),
        fastify.db.execute<RowDataPacket[]>(
          `SELECT sr.*, u.first_name, u.last_name FROM shift_roster sr
           JOIN users u ON sr.user_id = u.id
           WHERE sr.home_id = ? AND sr.shift_date = ?${shift ? ' AND sr.shift = ?' : ''}`,
          shift ? [homeId, today, shift] : [homeId, today]
        ),
        fastify.db.execute<RowDataPacket[]>(
          `SELECT i.id, i.status, i.severity, i.resident_id FROM incidents i
           WHERE i.home_id = ? AND i.status = 'open'`,
          [homeId]
        ),
      ]);

      return reply.send(success({
        announcements,
        residents,
        appointments,
        tasks,
        roster,
        openIncidents: incidents,
        stats: {
          residentCount:    residents.length,
          overdueMedCount:  medications.filter((m: RowDataPacket) => {
            if (!m.scheduled_time) return false;
            const now = new Date();
            const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            return String(m.scheduled_time).slice(0,5) <= hhmm;
          }).length,
          unfiledIposCount: residents.filter((r: RowDataPacket) =>
            !iposLogs.some((l: RowDataPacket) => l.resident_id === r.id)
          ).length,
          openIncidentCount: incidents.length,
          staffOnShiftCount: (roster as RowDataPacket[]).filter((r: RowDataPacket) => r.clocked_in_at && !r.clocked_out_at).length,
          isShiftActive:     (roster as RowDataPacket[]).some((r: RowDataPacket) => r.clocked_in_at && !r.clocked_out_at),
        },
      }));
    }
  );
};
