import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, comparePassword } from '../utils/password';
import { success, failure } from '../utils/response';
import { managerOrAbove } from '../middleware/rbac';
import { Role } from '../types';

interface LoginBody    { org_id: string; email: string; password: string; }
interface SignupBody   { organizationName: string; first_name: string; last_name: string; email: string; password: string; }
interface RegisterBody { first_name: string; last_name: string; email: string; password: string; role: Role; }

const VALID_ROLES: Role[] = ['employee', 'manager', 'org_admin'];

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── Login ────────────────────────────────────────────────────────────────
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { org_id, email, password } = request.body;

    if (!org_id || !email || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'org_id, email, and password are required'));

    const [orgs] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT * FROM orgs WHERE id = ?', [org_id]
    );
    if (!orgs[0])
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Organization not found'));

    const org = orgs[0];

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? AND org_id = ? AND is_active = 1',
      [email, org.id]
    );
    const user = rows[0];

    if (!user)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const valid = await comparePassword(password, user.password_hash);
    if (!valid)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const token = fastify.jwt.sign({
      id: user.id, email: user.email, role: user.role, org_id: org.id
    });

    return reply.send(success({
      token,
      user: {
        id: user.id, email: user.email, role: user.role,
        first_name: user.first_name, last_name: user.last_name,
        org_id: org.id, is_active: user.is_active
      },
      org: { id: org.id, name: org.name }
    }));
  });

  // ── Logout ───────────────────────────────────────────────────────────────
  fastify.post('/logout', async (_request, reply) => {
    return reply.send(success({ message: 'Logged out successfully' }));
  });

  // ── Sign up (public — creates org + org_admin) ───────────────────────────
  fastify.post<{ Body: SignupBody }>('/signup', async (request, reply) => {
    const { organizationName, first_name, last_name, email, password } = request.body;

    if (!organizationName || !first_name || !last_name || !email || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'organizationName, first_name, last_name, email, and password are required'));

    const conn = await fastify.db.getConnection();
    try {
      await conn.beginTransaction();

      const orgId  = uuidv4();
      const userId = uuidv4();

      await conn.execute(
        'INSERT INTO orgs (id, name) VALUES (?, ?)',
        [orgId, organizationName]
      );

      const password_hash = await hashPassword(password);
      await conn.execute(
        'INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, orgId, email, password_hash, first_name, last_name, 'org_admin']
      );

      await conn.commit();

      const token = fastify.jwt.sign({ id: userId, email, role: 'org_admin', org_id: orgId });

      return reply.code(201).send(success({
        token,
        user: { id: userId, email, role: 'org_admin', first_name, last_name, org_id: orgId, is_active: true },
        org:  { id: orgId, name: organizationName }
      }));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  // ── Register (org_admin/manager creates accounts within their org) ────────
  fastify.post<{ Body: RegisterBody }>(
    '/register',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { first_name, last_name, email, password, role } = request.body;
      const { org_id, role: requesterRole } = request.user;

      if (!first_name || !last_name || !email || !password || !role)
        return reply.code(400).send(failure('MISSING_FIELDS', 'first_name, last_name, email, password, and role are required'));

      if (!VALID_ROLES.includes(role))
        return reply.code(400).send(failure('INVALID_ROLE', 'Role must be employee, manager, or org_admin'));

      if (requesterRole === 'manager' && role !== 'employee')
        return reply.code(403).send(failure('FORBIDDEN', 'Managers can only create employee accounts'));

      const [existing] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND org_id = ?', [email, org_id]
      );
      if (existing[0])
        return reply.code(409).send(failure('EMAIL_TAKEN', 'Email already in use'));

      const userId        = uuidv4();
      const password_hash = await hashPassword(password);
      await fastify.db.execute(
        'INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, org_id, email, password_hash, first_name, last_name, role, request.user.id]
      );

      return reply.code(201).send(success({ id: userId, first_name, last_name, email, role }));
    }
  );

  // ── Me ───────────────────────────────────────────────────────────────────
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id, org_id } = request.user;

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_active, u.created_at,
              o.id as o_id, o.name as o_name
       FROM users u
       JOIN orgs o ON u.org_id = o.id
       WHERE u.id = ? AND u.org_id = ?`,
      [id, org_id]
    );
    if (!rows[0])
      return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

    const row = rows[0];
    return reply.send(success({
      id: row.id, first_name: row.first_name, last_name: row.last_name,
      email: row.email, role: row.role, is_active: row.is_active,
      org: { id: row.o_id, name: row.o_name }
    }));
  });
};
