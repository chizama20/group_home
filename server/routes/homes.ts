import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { adminOnly } from '../middleware/rbac';
import { canAccessHome } from '../utils/homeAccess';
import { logAudit } from '../utils/audit';
import { validate, createResidentSchema, createShiftNoteSchema, paginationSchema } from '../schemas';

interface HomeBody   { name: string; address?: string; phone?: string; capacity?: number; facility_type?: string; }
interface HomeParam  { id: string; }
interface StaffParam { id: string; userId: string; }
interface AssignBody { userId: string; }

interface ResidentBody {
  first_name: string; last_name: string; date_of_birth: string;
  room?: string; diagnosis?: string; physician?: string;
  primary_contact_name?: string; primary_contact_phone?: string;
  primary_contact_relation?: string; notes?: string;
  gender?: string; medicaid_id?: string; admit_date?: string;
  hab_waiver?: boolean; loa_info?: string; sleep_hours?: number;
  attends_day_program?: boolean; day_program_days_per_week?: number;
}

interface IposBody {
  resident_id: string; shift: 'day' | 'evening' | 'night';
  log_date: string; content: string;
}

interface BehavioralLogBody {
  resident_id: string; behavior_id: string; notes?: string; occurred_at: string;
}

interface ShiftNoteBody {
  resident_id?: string; shift: 'day' | 'evening' | 'night';
  shift_date: string; content: string; flagged?: boolean;
}


interface AppointmentBody {
  resident_id: string; type: string; title: string;
  appointment_date: string; appointment_time?: string;
  location?: string; notes?: string;
  collector_name?: string; collector_phone?: string;
}

interface AppointmentQuery { from?: string; days?: string; }

interface RosterBody { user_id: string; shift: 'day' | 'evening' | 'night'; shift_date: string; }
interface ClockBody  { shift: 'day' | 'evening' | 'night'; shift_date: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // HOME CRUD
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { org_id, id: userId, role } = request.user;
    let rows: RowDataPacket[];
    if (role === 'admin') {
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
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { org_id, id: userId } = request.user;
      const { name, address, phone, capacity, facility_type } = request.body;

      if (!name || typeof name !== 'string' || !name.trim())
        return reply.code(400).send(failure('MISSING_FIELDS', 'name is required'));

      const VALID_FACILITY_TYPES = ['group_home','assisted_living','foster_care','supported_living','day_program','other'];
      if (facility_type && !VALID_FACILITY_TYPES.includes(facility_type))
        return reply.code(400).send(failure('INVALID_VALUE', 'Invalid facility_type'));

      const id = uuidv4();
      await fastify.db.execute(
        'INSERT INTO homes (id, org_id, name, address, phone, capacity, facility_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, org_id, name.trim(), address ?? null, phone ?? null, capacity ?? null, facility_type ?? null]
      );

      const [[home]] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT * FROM homes WHERE id = ?', [id]
      );

      void logAudit(fastify, {
        org_id, user_id: userId,
        action: 'CREATE', entity_type: 'home', entity_id: id,
        description: `Created home: ${name.trim()}`,
      });

      return reply.code(201).send(success({ home }));
    }
  );

  fastify.patch<{ Params: HomeParam; Body: HomeBody }>(
    '/:id',
    { preHandler: [fastify.authenticate, adminOnly] },
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
    { preHandler: [fastify.authenticate, adminOnly] },
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STAFF
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.get<{ Params: HomeParam }>(
    '/:id/staff',
    { preHandler: [fastify.authenticate, adminOnly] },
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
    { preHandler: [fastify.authenticate, adminOnly] },
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
    { preHandler: [fastify.authenticate, adminOnly] },
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RESIDENTS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
        `SELECT r.*
         FROM residents r
         WHERE ${where}
         ORDER BY r.last_name, r.first_name
         LIMIT ? OFFSET ?`,
        [...values, Number(pg.limit), Number(offset)]
      );

      return reply.send(success(rows, { total: Number(total), page: pg.page, limit: pg.limit, pages: Math.ceil(Number(total) / pg.limit) }));
    }
  );

  fastify.post<{ Params: HomeParam; Body: ResidentBody }>(
    '/:id/residents',
    { preHandler: [fastify.authenticate, adminOnly] },
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

      const body = request.body as ResidentBody;
      const gender                    = body.gender ?? null;
      const medicaid_id               = body.medicaid_id ?? null;
      const admit_date                = body.admit_date ?? null;
      const hab_waiver                = body.hab_waiver ?? false;
      const loa_info                  = body.loa_info ?? null;
      const sleep_hours               = body.sleep_hours ?? null;
      const attends_day_program       = body.attends_day_program ?? false;
      const day_program_days_per_week = body.day_program_days_per_week ?? null;

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO residents
         (id, home_id, first_name, last_name, date_of_birth, room, diagnosis, physician,
          primary_contact_name, primary_contact_phone, primary_contact_relation, notes,
          gender, medicaid_id, admit_date, hab_waiver, loa_info, sleep_hours,
          attends_day_program, day_program_days_per_week, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, homeId, first_name, last_name, date_of_birth,
         room ?? null, diagnosis ?? null, physician ?? null,
         primary_contact_name ?? null, primary_contact_phone ?? null,
         primary_contact_relation ?? null, notes ?? null,
         gender, medicaid_id, admit_date, hab_waiver ? 1 : 0, loa_info,
         sleep_hours, attends_day_program ? 1 : 0, day_program_days_per_week, created_by]
      );
      return reply.code(201).send(success({ id }));
    }
  );

  // â”€â”€ GET /:id/ipos-logs â€” list structured IPOS logs for a home â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get<{ Params: HomeParam; Querystring: { date?: string; status?: string; resident_id?: string } }>(
    '/:id/ipos-logs',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { org_id } = request.user;
      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, request.params.id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { date, status, resident_id } = request.query;
      const conditions: string[] = ['il.home_id = ?'];
      const values: string[] = [request.params.id];

      if (date)        { conditions.push('il.log_date = ?');     values.push(date); }
      if (status)      { conditions.push('il.status = ?');       values.push(status); }
      if (resident_id) { conditions.push('il.resident_id = ?'); values.push(resident_id); }

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT il.*, r.first_name as resident_first, r.last_name as resident_last
         FROM ipos_logs il
         JOIN residents r ON il.resident_id = r.id
         WHERE ${conditions.join(' AND ')}
         ORDER BY il.log_date DESC`,
        values
      );
      return reply.send(success(rows));
    }
  );

  // â”€â”€ GET /:id/ipos-logs/review-queue â€” submitted logs pending manager review
  fastify.get<{ Params: HomeParam }>(
    '/:id/ipos-logs/review-queue',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { org_id } = request.user;
      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [request.params.id, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, request.params.id))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT il.*, r.first_name as resident_first, r.last_name as resident_last,
                COUNT(ie.id) as entry_count,
                GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name)) as staff_names,
                GROUP_CONCAT(DISTINCT ie.shift) as shifts_covered,
                DATEDIFF(DATE_ADD(il.log_date, INTERVAL 7 DAY), CURDATE()) as days_remaining
         FROM ipos_logs il
         JOIN residents r ON il.resident_id = r.id
         LEFT JOIN ipos_entries ie ON ie.log_id = il.id
         LEFT JOIN users u ON ie.user_id = u.id
         WHERE il.home_id = ? AND il.status = 'submitted'
         GROUP BY il.id
         ORDER BY il.log_date ASC`,
        [request.params.id]
      );
      return reply.send(success(rows));
    }
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MEDICATIONS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // IPOS LOGS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // IPOS compliance summary â€” filed vs pending per shift (manager+)
  fastify.get<{ Params: HomeParam; Querystring: { date?: string } }>(
    '/:id/ipos/compliance',
    { preHandler: [fastify.authenticate, adminOnly] },
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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // BEHAVIORAL LOGS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SHIFT NOTES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ANNOUNCEMENTS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // APPOINTMENTS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ROSTER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // Add staff to shift â€” emergency override (manager+)
  fastify.post<{ Params: HomeParam; Body: RosterBody }>(
    '/:id/roster',
    { preHandler: [fastify.authenticate, adminOnly] },
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

  // Remove a roster entry â€” manager override (manager+)
  fastify.delete<{ Params: { id: string; entryId: string } }>(
    '/:id/roster/:entryId',
    { preHandler: [fastify.authenticate, adminOnly] },
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

  // Clock in â€” sets clocked_in_at for current user (employee+)
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

  // Clock out â€” sets clocked_out_at for current user (employee+)
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
        return reply.code(404).send(failure('NOT_FOUND', 'No roster entry found â€” clock in first'));

      await fastify.db.execute(
        'UPDATE shift_roster SET clocked_out_at = NOW() WHERE home_id = ? AND user_id = ? AND shift = ? AND shift_date = ?',
        [homeId, user_id, shift, shift_date]
      );
      return reply.send(success({ message: 'Clocked out' }));
    }
  );

};
