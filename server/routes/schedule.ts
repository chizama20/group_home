import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { success, failure } from '../utils/response';
import { managerOrAbove } from '../middleware/rbac';
import { canAccessHome, getAccessibleHomeIds } from '../utils/homeAccess';
import { logAudit } from '../utils/audit';
import {
  sendShiftRequestSubmittedEmail,
  sendShiftRequestReviewedEmail,
} from '../services/email';

// ── interfaces ────────────────────────────────────────────────────────────────

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

// ── helpers ───────────────────────────────────────────────────────────────────

/** Returns the 7-day window [monday, sunday] for a given ISO date string */
function weekWindow(week: string): { start: string; end: string } {
  const d = new Date(week);
  const start = d.toISOString().split('T')[0];
  // end = start + 6 days
  d.setDate(d.getDate() + 6);
  const end = d.toISOString().split('T')[0];
  return { start, end };
}

// ── route plugin ──────────────────────────────────────────────────────────────

export default async (fastify: FastifyInstance): Promise<void> => {

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /homes/:homeId/schedule
  // Returns all shift_slots for a 7-day week, grouped by date then shift_type
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get<{ Params: HomeParam; Querystring: WeekQuery }>(
    '/homes/:homeId/schedule',
    { preHandler: [fastify.authenticate, managerOrAbove] },
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

      // Group by date → shift_type
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

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /homes/:homeId/schedule/slots — create a slot
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.post<{ Params: HomeParam; Body: CreateSlotBody }>(
    '/homes/:homeId/schedule/slots',
    { preHandler: [fastify.authenticate, managerOrAbove] },
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

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /homes/:homeId/schedule/slots/:slotId — update a slot
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.patch<{ Params: SlotParam; Body: PatchSlotBody }>(
    '/homes/:homeId/schedule/slots/:slotId',
    { preHandler: [fastify.authenticate, managerOrAbove] },
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

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /homes/:homeId/schedule/slots/:slotId — hard delete a slot
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.delete<{ Params: SlotParam }>(
    '/homes/:homeId/schedule/slots/:slotId',
    { preHandler: [fastify.authenticate, managerOrAbove] },
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

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /homes/:homeId/schedule/requests
  // Managers see all; employees see only their own
  // ═══════════════════════════════════════════════════════════════════════════

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

      const isManager = role === 'manager' || role === 'org_admin';

      const filters: string[] = ['sr.home_id = ?'];
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

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /homes/:homeId/schedule/requests — staff submits time-off request
  // ═══════════════════════════════════════════════════════════════════════════

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
        `SELECT u.email FROM users u
         JOIN home_staff hs ON u.id = hs.user_id
         WHERE hs.home_id = ? AND u.role IN ('manager', 'org_admin') AND u.is_active = 1`,
        [homeId]
      );

      const homeName = String(homeCheck[0].name ?? homeId);
      for (const mgr of managers as RowDataPacket[]) {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /homes/:homeId/schedule/requests/:requestId — manager approves/denies
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.patch<{ Params: RequestParam; Body: ReviewRequestBody }>(
    '/homes/:homeId/schedule/requests/:requestId',
    { preHandler: [fastify.authenticate, managerOrAbove] },
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
                u.email AS requester_email, u.first_name AS requester_first, u.last_name AS requester_last
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
      const requesterEmail = String(shiftReq.requester_email);
      const requesterName  = `${String(shiftReq.requester_first)} ${String(shiftReq.requester_last)}`;
      void sendShiftRequestReviewedEmail(
        requesterEmail,
        requesterName,
        status,
        String(shiftReq.date),
        String(shiftReq.shift_type)
      ).catch(() => { /* non-fatal */ });

      return reply.send(success({ message: `Request ${status}` }));
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /schedule/my-slots — upcoming slots for the authenticated user
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get(
    '/schedule/my-slots',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id: userId } = request.user;

      const accessibleHomeIds = await getAccessibleHomeIds(fastify, request.user);

      // org_admin with null means all homes — no restriction needed; but for safety
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
};
