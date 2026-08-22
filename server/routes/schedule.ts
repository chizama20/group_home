import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { adminOnly } from '../middleware/rbac';
import { canAccessHome, getAccessibleHomeIds } from '../utils/homeAccess';
import { logAudit } from '../utils/audit';
import {
  sendShiftRequestSubmittedEmail,
  sendShiftRequestReviewedEmail,
} from '../services/email';

// â”€â”€ interfaces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface HomeParam   { homeId: string; }
interface SlotParam   { homeId: string; slotId: string; }
interface RequestParam { homeId: string; requestId: string; }

interface WeekQuery { week?: string; }

interface CreateSlotBody {
  user_id: string;
  date: string;
  shift_type: 'day' | 'evening' | 'night';
  notes?: string;
}

interface PatchSlotBody {
  user_id?: string;
  date?: string;
  shift_type?: 'day' | 'evening' | 'night';
  status?: 'scheduled' | 'cancelled';
  notes?: string;
}

interface CreateRequestBody {
  slot_id: string;
  date: string;
  shift_type: 'day' | 'evening' | 'night';
  reason?: string;
}

interface ReviewRequestBody {
  status: 'approved' | 'denied';
  replacement_user_id?: string;
}

const VALID_SHIFT_TYPES = ['day', 'evening', 'night'];

interface CreateTradeBody { slot_id: string; reason?: string; }

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Default true (opt-out model) — a user with no prefs saved yet still gets schedule emails. */
function wantsScheduleChangeEmail(notificationPrefs: unknown): boolean {
  if (!notificationPrefs || typeof notificationPrefs !== 'object') return true;
  const prefs = notificationPrefs as Record<string, unknown>;
  return prefs.schedule_changes !== false;
}

/** Returns the 7-day window [monday, sunday] for a given ISO date string */
function weekWindow(week: string): { start: string; end: string } {
  const d = new Date(week);
  const start = d.toISOString().split('T')[0];
  // end = start + 6 days
  d.setDate(d.getDate() + 6);
  const end = d.toISOString().split('T')[0];
  return { start, end };
}

// â”€â”€ route plugin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default async (fastify: FastifyInstance): Promise<void> => {

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // GET /homes/:homeId/schedule
  // Returns all shift_slots for a 7-day week, grouped by date then shift_type
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.get<{ Params: HomeParam; Querystring: WeekQuery }>(
    '/homes/:homeId/schedule',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { homeId } = request.params;
      const { org_id } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const week = request.query.week ?? new Date().toISOString().split('T')[0];
      const { start, end } = weekWindow(week);

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT ss.id, ss.date, ss.shift_type, ss.status, ss.notes, ss.created_at, ss.updated_at,
                u.id AS user_id, u.first_name, u.last_name, u.role
         FROM shift_slots ss
         JOIN users u ON ss.user_id = u.id
         WHERE ss.home_id = ? AND ss.date >= ? AND ss.date <= ?
         ORDER BY ss.date, ss.shift_type, u.last_name, u.first_name`,
        [homeId, start, end]
      );

      // Group by date â†’ shift_type
      const grouped: Record<string, Record<string, RowDataPacket[]>> = {};
      for (const row of rows as RowDataPacket[]) {
        const dateKey  = String(row.date).split('T')[0];
        const shiftKey = String(row.shift_type);
        if (!grouped[dateKey]) grouped[dateKey] = {};
        if (!grouped[dateKey][shiftKey]) grouped[dateKey][shiftKey] = [];
        grouped[dateKey][shiftKey].push(row);
      }

      return reply.send(success({ week: start, schedule: grouped }));
    }
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /homes/:homeId/schedule/slots â€” create a slot
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.post<{ Params: HomeParam; Body: CreateSlotBody }>(
    '/homes/:homeId/schedule/slots',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { homeId } = request.params;
      const { org_id, id: created_by } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { user_id, date, shift_type, notes } = request.body;
      if (!user_id || !date || !shift_type)
        return reply.code(400).send(failure('MISSING_FIELDS', 'user_id, date, and shift_type are required'));
      if (!VALID_SHIFT_TYPES.includes(shift_type))
        return reply.code(400).send(failure('INVALID_VALUE', 'shift_type must be day, evening, or night'));

      // Verify the assigned user belongs to this home
      const [userCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT u.id FROM users u JOIN home_staff hs ON u.id = hs.user_id WHERE u.id = ? AND hs.home_id = ? AND u.org_id = ?',
        [user_id, homeId, org_id]
      );
      if (!userCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'User not found in this home'));

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO shift_slots (id, home_id, user_id, date, shift_type, status, notes, created_by)
         VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
        [id, homeId, user_id, date, shift_type, notes ?? null, created_by]
      );

      void logAudit(fastify, {
        org_id, user_id: created_by,
        action: 'CREATE', entity_type: 'shift_slot', entity_id: id,
        description: `Created shift slot for user ${user_id} on ${date} (${shift_type})`,
      });

      return reply.code(201).send(success({ id }));
    }
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PATCH /homes/:homeId/schedule/slots/:slotId â€” update a slot
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.patch<{ Params: SlotParam; Body: PatchSlotBody }>(
    '/homes/:homeId/schedule/slots/:slotId',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { homeId, slotId } = request.params;
      const { org_id, id: userId } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const [slotCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM shift_slots WHERE id = ? AND home_id = ?', [slotId, homeId]
      );
      if (!slotCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Slot not found'));

      const { user_id, date, shift_type, status, notes } = request.body;

      if (shift_type && !VALID_SHIFT_TYPES.includes(shift_type))
        return reply.code(400).send(failure('INVALID_VALUE', 'shift_type must be day, evening, or night'));
      if (status && !['scheduled', 'cancelled'].includes(status))
        return reply.code(400).send(failure('INVALID_VALUE', 'status must be scheduled or cancelled'));

      // If reassigning, verify new user is in this home
      if (user_id) {
        const [userCheck] = await fastify.db.execute<RowDataPacket[]>(
          'SELECT u.id FROM users u JOIN home_staff hs ON u.id = hs.user_id WHERE u.id = ? AND hs.home_id = ? AND u.org_id = ?',
          [user_id, homeId, org_id]
        );
        if (!userCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'User not found in this home'));
      }

      const updates: string[] = ['updated_at = NOW()'];
      const values: (string | null)[] = [];
      if (user_id    !== undefined) { updates.push('user_id = ?');    values.push(user_id); }
      if (date       !== undefined) { updates.push('date = ?');       values.push(date); }
      if (shift_type !== undefined) { updates.push('shift_type = ?'); values.push(shift_type); }
      if (status     !== undefined) { updates.push('status = ?');     values.push(status); }
      if (notes      !== undefined) { updates.push('notes = ?');      values.push(notes ?? null); }

      if (updates.length === 1)
        return reply.code(400).send(failure('MISSING_FIELDS', 'At least one field to update is required'));

      values.push(slotId);
      await fastify.db.execute(
        `UPDATE shift_slots SET ${updates.join(', ')} WHERE id = ?`, values
      );

      void logAudit(fastify, {
        org_id, user_id: userId,
        action: 'UPDATE', entity_type: 'shift_slot', entity_id: slotId,
        description: `Updated shift slot ${slotId}`,
      });

      return reply.send(success({ message: 'Slot updated' }));
    }
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // DELETE /homes/:homeId/schedule/slots/:slotId â€” hard delete a slot
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.delete<{ Params: SlotParam }>(
    '/homes/:homeId/schedule/slots/:slotId',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { homeId, slotId } = request.params;
      const { org_id, id: userId } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const [slotCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM shift_slots WHERE id = ? AND home_id = ?', [slotId, homeId]
      );
      if (!slotCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Slot not found'));

      await fastify.db.execute('DELETE FROM shift_slots WHERE id = ?', [slotId]);

      void logAudit(fastify, {
        org_id, user_id: userId,
        action: 'DELETE', entity_type: 'shift_slot', entity_id: slotId,
        description: `Deleted shift slot ${slotId}`,
      });

      return reply.send(success({ message: 'Slot deleted' }));
    }
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // GET /homes/:homeId/schedule/requests
  // Managers see all; employees see only their own
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.get<{ Params: HomeParam }>(
    '/homes/:homeId/schedule/requests',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { homeId } = request.params;
      const { org_id, id: userId, role } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const isManager = role === 'admin';

      const filters: string[] = ['sr.home_id = ?', "sr.type = 'time_off'"];
      const values: string[] = [homeId];

      if (!isManager) {
        filters.push('sr.requester_id = ?');
        values.push(userId);
      }

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT sr.id, sr.type, sr.date, sr.shift_type, sr.reason, sr.status,
                sr.replacement_user_id, sr.reviewed_at, sr.created_at, sr.updated_at,
                sr.slot_id,
                req.id AS requester_id, req.first_name AS requester_first, req.last_name AS requester_last,
                rev.first_name AS reviewer_first, rev.last_name AS reviewer_last,
                ss.date AS slot_date, ss.shift_type AS slot_shift_type
         FROM shift_requests sr
         JOIN users req ON sr.requester_id = req.id
         LEFT JOIN users rev ON sr.reviewed_by = rev.id
         LEFT JOIN shift_slots ss ON sr.slot_id = ss.id
         WHERE ${filters.join(' AND ')}
         ORDER BY sr.created_at DESC`,
        values
      );

      return reply.send(success(rows));
    }
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POST /homes/:homeId/schedule/requests â€” staff submits time-off request
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.post<{ Params: HomeParam; Body: CreateRequestBody }>(
    '/homes/:homeId/schedule/requests',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { homeId } = request.params;
      const { org_id, id: requesterId } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, name FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { slot_id, date, shift_type, reason } = request.body;
      if (!slot_id || !date || !shift_type)
        return reply.code(400).send(failure('MISSING_FIELDS', 'slot_id, date, and shift_type are required'));
      if (!VALID_SHIFT_TYPES.includes(shift_type))
        return reply.code(400).send(failure('INVALID_VALUE', 'shift_type must be day, evening, or night'));

      // Verify the slot belongs to this requester and this home
      const [slotCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM shift_slots WHERE id = ? AND home_id = ? AND user_id = ?',
        [slot_id, homeId, requesterId]
      );
      if (!slotCheck[0])
        return reply.code(403).send(failure('FORBIDDEN', 'Slot does not belong to you or does not exist in this home'));

      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO shift_requests (id, home_id, requester_id, slot_id, type, date, shift_type, reason, status)
         VALUES (?, ?, ?, ?, 'time_off', ?, ?, ?, 'pending')`,
        [id, homeId, requesterId, slot_id, date, shift_type, reason ?? null]
      );

      void logAudit(fastify, {
        org_id, user_id: requesterId,
        action: 'CREATE', entity_type: 'shift_request', entity_id: id,
        description: `Time-off request submitted for ${date} (${shift_type})`,
      });

      // Fetch requester name for email
      const [[requester]] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT first_name, last_name FROM users WHERE id = ?', [requesterId]
      );
      const requesterName = requester
        ? `${String(requester.first_name)} ${String(requester.last_name)}`
        : 'A staff member';

      // Email all managers of this home
      const [managers] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT u.email, u.notification_prefs FROM users u
         JOIN home_staff hs ON u.id = hs.user_id
         WHERE hs.home_id = ? AND u.role = 'admin' AND u.is_active = 1`,
        [homeId]
      );

      const homeName = String(homeCheck[0].name ?? homeId);
      for (const mgr of managers as RowDataPacket[]) {
        if (!wantsScheduleChangeEmail(mgr.notification_prefs)) continue;
        void sendShiftRequestSubmittedEmail(
          String(mgr.email),
          requesterName,
          date,
          shift_type,
          homeName
        ).catch(() => { /* non-fatal */ });
      }

      return reply.code(201).send(success({ id }));
    }
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PATCH /homes/:homeId/schedule/requests/:requestId â€” manager approves/denies
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.patch<{ Params: RequestParam; Body: ReviewRequestBody }>(
    '/homes/:homeId/schedule/requests/:requestId',
    { preHandler: [fastify.authenticate, adminOnly] },
    async (request, reply) => {
      const { homeId, requestId } = request.params;
      const { org_id, id: reviewerId } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const [reqCheck] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT sr.id, sr.slot_id, sr.status, sr.requester_id, sr.date, sr.shift_type,
                u.email AS requester_email, u.first_name AS requester_first, u.last_name AS requester_last,
                u.notification_prefs
         FROM shift_requests sr
         JOIN users u ON sr.requester_id = u.id
         WHERE sr.id = ? AND sr.home_id = ?`,
        [requestId, homeId]
      );
      if (!reqCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Request not found'));

      const shiftReq = reqCheck[0];

      if (shiftReq.status !== 'pending')
        return reply.code(409).send(failure('CONFLICT', 'Request has already been reviewed'));

      const { status, replacement_user_id } = request.body;
      if (!status || !['approved', 'denied'].includes(status))
        return reply.code(400).send(failure('INVALID_VALUE', 'status must be approved or denied'));

      // Validate replacement user if provided
      if (replacement_user_id) {
        const [repCheck] = await fastify.db.execute<RowDataPacket[]>(
          'SELECT u.id FROM users u JOIN home_staff hs ON u.id = hs.user_id WHERE u.id = ? AND hs.home_id = ? AND u.org_id = ?',
          [replacement_user_id, homeId, org_id]
        );
        if (!repCheck[0])
          return reply.code(404).send(failure('NOT_FOUND', 'Replacement user not found in this home'));
      }

      // Update the request
      await fastify.db.execute(
        `UPDATE shift_requests
         SET status = ?, replacement_user_id = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [status, replacement_user_id ?? null, reviewerId, requestId]
      );

      // If approved and replacement provided, update the slot's user_id
      if (status === 'approved' && replacement_user_id && shiftReq.slot_id) {
        await fastify.db.execute(
          'UPDATE shift_slots SET user_id = ?, updated_at = NOW() WHERE id = ?',
          [replacement_user_id, shiftReq.slot_id]
        );
      }

      void logAudit(fastify, {
        org_id, user_id: reviewerId,
        action: 'UPDATE', entity_type: 'shift_request', entity_id: requestId,
        description: `Shift request ${status} for ${String(shiftReq.date)} (${String(shiftReq.shift_type)})`,
      });

      // Email requester
      if (wantsScheduleChangeEmail(shiftReq.notification_prefs)) {
        const requesterEmail = String(shiftReq.requester_email);
        const requesterName  = `${String(shiftReq.requester_first)} ${String(shiftReq.requester_last)}`;
        void sendShiftRequestReviewedEmail(
          requesterEmail,
          requesterName,
          status,
          String(shiftReq.date),
          String(shiftReq.shift_type)
        ).catch(() => { /* non-fatal */ });
      }

      return reply.send(success({ message: `Request ${status}` }));
    }
  );


  // ── POST /homes/:homeId/schedule/trades — staff offers one of their own slots ──

  fastify.post<{ Params: HomeParam; Body: CreateTradeBody }>(
    '/homes/:homeId/schedule/trades',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { homeId } = request.params;
      const { org_id, id: requesterId } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const { slot_id, reason } = request.body;
      if (!slot_id)
        return reply.code(400).send(failure('MISSING_FIELDS', 'slot_id is required'));

      // Verify the slot belongs to this requester, this home, is still scheduled, and hasn't passed
      const [slotCheck] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT id, date, shift_type FROM shift_slots
         WHERE id = ? AND home_id = ? AND user_id = ? AND status = 'scheduled' AND date >= CURDATE()`,
        [slot_id, homeId, requesterId]
      );
      if (!slotCheck[0])
        return reply.code(403).send(failure('FORBIDDEN', 'Slot does not belong to you, is not upcoming, or does not exist in this home'));

      // Only one open trade offer per slot at a time
      const [existing] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT id FROM shift_requests WHERE slot_id = ? AND type = 'trade' AND status = 'pending'`,
        [slot_id]
      );
      if (existing[0])
        return reply.code(409).send(failure('CONFLICT', 'This shift is already offered for trade'));

      const slot = slotCheck[0];
      const id = uuidv4();
      await fastify.db.execute(
        `INSERT INTO shift_requests (id, home_id, requester_id, slot_id, type, date, shift_type, reason, status)
         VALUES (?, ?, ?, ?, 'trade', ?, ?, ?, 'pending')`,
        [id, homeId, requesterId, slot_id, slot.date, slot.shift_type, reason ?? null]
      );

      void logAudit(fastify, {
        org_id, user_id: requesterId,
        action: 'CREATE', entity_type: 'shift_request', entity_id: id,
        description: `Offered shift for trade: ${String(slot.date)} (${String(slot.shift_type)})`,
      });

      return reply.code(201).send(success({ id }));
    }
  );

  // ── GET /homes/:homeId/schedule/trades — { open, mine } ──────────────────

  fastify.get<{ Params: HomeParam }>(
    '/homes/:homeId/schedule/trades',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { homeId } = request.params;
      const { org_id, id: userId } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const selectCols = `sr.id, sr.slot_id, sr.date, sr.shift_type, sr.reason, sr.status,
                req.id AS requester_id, req.first_name AS requester_first, req.last_name AS requester_last,
                sr.replacement_user_id, sr.reviewed_at, sr.created_at`;

      const [open] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT ${selectCols}
         FROM shift_requests sr
         JOIN users req ON sr.requester_id = req.id
         WHERE sr.home_id = ? AND sr.type = 'trade' AND sr.status = 'pending' AND sr.requester_id != ?
         ORDER BY sr.date ASC`,
        [homeId, userId]
      );

      const [mine] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT ${selectCols}
         FROM shift_requests sr
         JOIN users req ON sr.requester_id = req.id
         WHERE sr.home_id = ? AND sr.type = 'trade' AND sr.requester_id = ?
         ORDER BY sr.created_at DESC`,
        [homeId, userId]
      );

      return reply.send(success({ open, mine }));
    }
  );

  // ── POST /homes/:homeId/schedule/trades/:requestId/claim — claim an open trade ──

  fastify.post<{ Params: RequestParam }>(
    '/homes/:homeId/schedule/trades/:requestId/claim',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { homeId, requestId } = request.params;
      const { org_id, id: claimerId } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      // Verify claimer is staff at this home
      const [claimerCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT u.id FROM users u JOIN home_staff hs ON u.id = hs.user_id WHERE u.id = ? AND hs.home_id = ?',
        [claimerId, homeId]
      );
      if (!claimerCheck[0])
        return reply.code(403).send(failure('FORBIDDEN', 'You are not assigned to this home'));

      const conn = await fastify.db.getConnection();
      try {
        await conn.beginTransaction();

        const [reqRows] = await conn.execute<RowDataPacket[]>(
          `SELECT id, slot_id, type, status, requester_id, date, shift_type
           FROM shift_requests WHERE id = ? AND home_id = ? FOR UPDATE`,
          [requestId, homeId]
        );
        const shiftReq = reqRows[0];
        if (!shiftReq) {
          await conn.rollback();
          return reply.code(404).send(failure('NOT_FOUND', 'Trade offer not found'));
        }
        if (shiftReq.type !== 'trade' || shiftReq.status !== 'pending') {
          await conn.rollback();
          return reply.code(409).send(failure('CONFLICT', 'This trade offer is no longer available'));
        }
        if (shiftReq.requester_id === claimerId) {
          await conn.rollback();
          return reply.code(400).send(failure('INVALID', 'You cannot claim your own shift offer'));
        }

        await conn.execute(
          `UPDATE shift_requests
           SET status = 'approved', replacement_user_id = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
           WHERE id = ?`,
          [claimerId, claimerId, requestId]
        );

        if (shiftReq.slot_id) {
          await conn.execute(
            'UPDATE shift_slots SET user_id = ?, updated_at = NOW() WHERE id = ?',
            [claimerId, shiftReq.slot_id]
          );
        }

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      void logAudit(fastify, {
        org_id, user_id: claimerId,
        action: 'UPDATE', entity_type: 'shift_request', entity_id: requestId,
        description: `Shift trade claimed by ${claimerId}`,
      });

      return reply.send(success({ message: 'Shift claimed' }));
    }
  );

  // ── POST /homes/:homeId/schedule/trades/:requestId/cancel — requester withdraws ──

  fastify.post<{ Params: RequestParam }>(
    '/homes/:homeId/schedule/trades/:requestId/cancel',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { homeId, requestId } = request.params;
      const { org_id, id: userId } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const [reqRows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT id, requester_id, status FROM shift_requests WHERE id = ? AND home_id = ? AND type = 'trade'`,
        [requestId, homeId]
      );
      if (!reqRows[0]) return reply.code(404).send(failure('NOT_FOUND', 'Trade offer not found'));
      if (reqRows[0].requester_id !== userId)
        return reply.code(403).send(failure('FORBIDDEN', 'You can only cancel your own trade offers'));
      if (reqRows[0].status !== 'pending')
        return reply.code(409).send(failure('CONFLICT', 'This trade offer can no longer be cancelled'));

      await fastify.db.execute(
        `UPDATE shift_requests SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
        [requestId]
      );

      void logAudit(fastify, {
        org_id, user_id: userId,
        action: 'UPDATE', entity_type: 'shift_request', entity_id: requestId,
        description: 'Shift trade offer cancelled',
      });

      return reply.send(success({ message: 'Trade offer cancelled' }));
    }
  );

  // ── GET /homes/:homeId/schedule/live-roster — who's on now / on later, today ──

  fastify.get<{ Params: HomeParam }>(
    '/homes/:homeId/schedule/live-roster',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { homeId } = request.params;
      const { org_id } = request.user;

      const [homeCheck] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM homes WHERE id = ? AND org_id = ?', [homeId, org_id]
      );
      if (!homeCheck[0]) return reply.code(404).send(failure('NOT_FOUND', 'Home not found'));
      if (!await canAccessHome(fastify, request.user, homeId))
        return reply.code(403).send(failure('FORBIDDEN', 'Access denied'));

      const [onNow] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT u.id AS user_id, u.first_name, u.last_name, u.phone, u.role,
                sr.shift, sr.clocked_in_at
         FROM shift_roster sr
         JOIN users u ON sr.user_id = u.id
         WHERE sr.home_id = ? AND sr.shift_date = CURDATE()
           AND sr.clocked_in_at IS NOT NULL AND sr.clocked_out_at IS NULL
         ORDER BY sr.clocked_in_at ASC`,
        [homeId]
      );

      const [onLater] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT ss.id AS slot_id, u.id AS user_id, u.first_name, u.last_name, u.phone, u.role,
                ss.shift_type, ss.date
         FROM shift_slots ss
         JOIN users u ON ss.user_id = u.id
         LEFT JOIN shift_roster sr
           ON sr.home_id = ss.home_id AND sr.user_id = ss.user_id
          AND sr.shift = ss.shift_type AND sr.shift_date = ss.date
         WHERE ss.home_id = ? AND ss.date = CURDATE() AND ss.status = 'scheduled'
           AND (sr.clocked_in_at IS NULL OR sr.clocked_out_at IS NOT NULL)
         ORDER BY FIELD(ss.shift_type, 'day', 'evening', 'night'), u.last_name`,
        [homeId]
      );

      return reply.send(success({ onNow, onLater }));
    }
  );

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // GET /schedule/my-slots â€” upcoming slots for the authenticated user
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  fastify.get(
    '/schedule/my-slots',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: userId } = request.user;

      const accessibleHomeIds = await getAccessibleHomeIds(fastify, request.user);

      // admin with null means all homes â€” no restriction needed; but for safety
      // we still return only their own slots via user_id = ?
      let homeFilter = '';
      const values: string[] = [userId];

      if (accessibleHomeIds !== null) {
        if (accessibleHomeIds.length === 0)
          return reply.send(success([]));
        homeFilter = `AND ss.home_id IN (${accessibleHomeIds.map(() => '?').join(',')})`;
        values.push(...accessibleHomeIds);
      }

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT ss.id, ss.date, ss.shift_type, ss.status, ss.notes, ss.created_at,
                h.id AS home_id, h.name AS home_name
         FROM shift_slots ss
         JOIN homes h ON ss.home_id = h.id
         WHERE ss.user_id = ?
           AND ss.status = 'scheduled'
           AND ss.date >= CURDATE()
           ${homeFilter}
         ORDER BY ss.date ASC`,
        values
      );

      return reply.send(success(rows));
    }
  );

  // ── GET /schedule/recent-changes — shift_slot/shift_request activity feed ──

  fastify.get(
    '/schedule/recent-changes',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: userId, org_id } = request.user;

      const accessibleHomeIds = await getAccessibleHomeIds(fastify, request.user);
      if (accessibleHomeIds !== null && accessibleHomeIds.length === 0)
        return reply.send(success({ items: [], unseenCount: 0 }));

      const [[userRow]] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT last_seen_schedule_change_at FROM users WHERE id = ?', [userId]
      );
      const lastSeen = userRow?.last_seen_schedule_change_at ?? null;

      let scopeFilter = '';
      const scopeValues: string[] = [];
      if (accessibleHomeIds !== null) {
        scopeFilter = `AND COALESCE(ss.home_id, sr.home_id) IN (${accessibleHomeIds.map(() => '?').join(',')})`;
        scopeValues.push(...accessibleHomeIds);
      }

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        `SELECT al.id, al.action, al.entity_type, al.entity_id, al.description, al.created_at,
                u.first_name AS actor_first, u.last_name AS actor_last,
                COALESCE(ss.home_id, sr.home_id) AS home_id,
                (? IS NULL OR al.created_at > ?) AS is_new
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         LEFT JOIN shift_slots ss ON al.entity_type = 'shift_slot' AND al.entity_id = ss.id
         LEFT JOIN shift_requests sr ON al.entity_type = 'shift_request' AND al.entity_id = sr.id
         WHERE al.org_id = ? AND al.entity_type IN ('shift_slot', 'shift_request')
           ${scopeFilter}
         ORDER BY al.created_at DESC
         LIMIT 50`,
        [lastSeen, lastSeen, org_id, ...scopeValues]
      );

      const unseenCount = (rows as RowDataPacket[]).filter(r => Number(r.is_new) === 1).length;

      return reply.send(success({ items: rows, unseenCount }));
    }
  );

  // ── POST /schedule/recent-changes/mark-seen ───────────────────────────────

  fastify.post(
    '/schedule/recent-changes/mark-seen',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: userId } = request.user;
      await fastify.db.execute(
        'UPDATE users SET last_seen_schedule_change_at = NOW() WHERE id = ?', [userId]
      );
      return reply.send(success({ message: 'Marked as seen' }));
    }
  );
};
