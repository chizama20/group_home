import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { hashPassword, comparePassword } from '../utils/password';
import { success, failure } from '../utils/response';
import { managerOrAbove } from '../middleware/rbac';
import { toSlug, randomSuffix } from '../utils/slug';
import { Role } from '../types';

interface LoginBody    { organizationSlug: string; email: string; password: string; }
interface SignupBody   { organizationName: string; ownerName: string; email: string; password: string; phone?: string; }
interface RegisterBody { name: string; email: string; password: string; role: Role; phone?: string; position?: string; }

const VALID_ROLES: Role[] = ['owner', 'manager', 'staff'];

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── Login ────────────────────────────────────────────────────────────────
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { organizationSlug, email, password } = request.body;

    if (!organizationSlug || !email || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'organizationSlug, email, and password are required'));

    const [orgs] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT * FROM organizations WHERE slug = ?', [organizationSlug]
    );
    if (!orgs[0])
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Organization not found'));

    const org = orgs[0];

    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? AND organization_id = ? AND active = 1',
      [email, org.id]
    );
    const user = rows[0];

    if (!user)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const valid = await comparePassword(password, user.password_hash);
    if (!valid)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const token = fastify.jwt.sign({
      id: user.id, email: user.email, role: user.role, organizationId: org.id
    });

    return reply.send(success({
      token,
      user:         { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: org.id },
      organization: { id: org.id, name: org.name, slug: org.slug }
    }));
  });

  // ── Logout ───────────────────────────────────────────────────────────────
  fastify.post('/logout', async (_request, reply) => {
    return reply.send(success({ message: 'Logged out successfully' }));
  });

  // ── Sign up (public — creates org + owner) ───────────────────────────────
  fastify.post<{ Body: SignupBody }>('/signup', async (request, reply) => {
    const { organizationName, ownerName, email, password, phone } = request.body;

    if (!organizationName || !ownerName || !email || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'organizationName, ownerName, email, and password are required'));

    // Generate a unique slug
    let slug = toSlug(organizationName);
    const [existing] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT id FROM organizations WHERE slug = ?', [slug]
    );
    if (existing[0]) slug = `${slug}-${randomSuffix()}`;

    const conn = await fastify.mysql.getConnection();
    try {
      await conn.query('START TRANSACTION');

      const [orgResult] = await conn.query<ResultSetHeader>(
        'INSERT INTO organizations (name, slug) VALUES (?, ?)', [organizationName, slug]
      );
      const orgId = orgResult.insertId;

      const password_hash = await hashPassword(password);
      const [userResult] = await conn.query<ResultSetHeader>(
        'INSERT INTO users (organization_id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [orgId, ownerName, email, password_hash, 'owner', phone ?? null]
      );
      const userId = userResult.insertId;

      await conn.query('COMMIT');

      const token = fastify.jwt.sign({ id: userId, email, role: 'owner', organizationId: orgId });

      return reply.code(201).send(success({
        token,
        user:         { id: userId, name: ownerName, email, role: 'owner', organizationId: orgId },
        organization: { id: orgId, name: organizationName, slug }
      }));
    } catch (err) {
      await conn.query('ROLLBACK');
      throw err;
    } finally {
      conn.release();
    }
  });

  // ── Register (owner/manager creates accounts within their org) ───────────
  fastify.post<{ Body: RegisterBody }>(
    '/register',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { name, email, password, role, phone, position } = request.body;
      const { organizationId, role: requesterRole } = request.user;

      if (!name || !email || !password || !role)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name, email, password, and role are required'));

      if (!VALID_ROLES.includes(role))
        return reply.code(400).send(failure('INVALID_ROLE', 'Role must be owner, manager, or staff'));

      if (requesterRole === 'manager' && role !== 'staff')
        return reply.code(403).send(failure('FORBIDDEN', 'Managers can only create staff accounts'));

      const [existing] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND organization_id = ?', [email, organizationId]
      );
      if (existing[0])
        return reply.code(409).send(failure('EMAIL_TAKEN', 'Email already in use'));

      const password_hash = await hashPassword(password);
      const [result] = await fastify.mysql.query<ResultSetHeader>(
        'INSERT INTO users (organization_id, name, email, password_hash, role, phone, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [organizationId, name, email, password_hash, role, phone ?? null, position ?? null]
      );

      return reply.code(201).send(success({ id: result.insertId, name, email, role }));
    }
  );

  // ── Me ───────────────────────────────────────────────────────────────────
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id, organizationId } = request.user;

    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.position, u.created_at,
              o.id as org_id, o.name as org_name, o.slug as org_slug
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ? AND u.organization_id = ?`,
      [id, organizationId]
    );
    if (!rows[0])
      return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

    const row = rows[0];
    return reply.send(success({
      id: row.id, name: row.name, email: row.email, role: row.role,
      phone: row.phone, position: row.position, created_at: row.created_at,
      organization: { id: row.org_id, name: row.org_name, slug: row.org_slug }
    }));
  });
};
