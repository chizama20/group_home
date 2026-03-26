import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, comparePassword } from '../utils/password';
import { success, failure } from '../utils/response';

interface LoginBody  { email: string; password: string; }
interface SignupBody { organizationName: string; first_name: string; last_name: string; email: string; password: string; }

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── Login ────────────────────────────────────────────────────────────────
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'email and password are required'));

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.is_active, u.org_id, o.name as org_name FROM users u JOIN orgs o ON u.org_id = o.id WHERE u.email = ? AND u.is_active = 1',
      [email]
    );
    const user = rows[0];

    if (!user)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const valid = await comparePassword(password, user.password_hash);
    if (!valid)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const token = fastify.jwt.sign({ id: user.id, role: user.role, org_id: user.org_id });

    return reply.send(success({
      token,
      user: {
        id: user.id, email: user.email, role: user.role,
        first_name: user.first_name, last_name: user.last_name,
        org_id: user.org_id
      },
      org: { id: user.org_id, name: user.org_name }
    }));
  });

  // ── Logout ───────────────────────────────────────────────────────────────
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (_request, reply) => {
    return reply.send(success({ message: 'Logged out successfully' }));
  });

  // ── Signup (public — creates org + org_admin) ────────────────────────────
  fastify.post<{ Body: SignupBody }>('/signup', async (request, reply) => {
    const { organizationName, first_name, last_name, email, password } = request.body;

    if (!organizationName || !first_name || !last_name || !email || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'organizationName, first_name, last_name, email, and password are required'));

    const conn = await fastify.db.getConnection();
    try {
      await conn.beginTransaction();

      const orgId  = uuidv4();
      const userId = uuidv4();

      await conn.execute('INSERT INTO orgs (id, name) VALUES (?, ?)', [orgId, organizationName]);

      const password_hash = await hashPassword(password);
      await conn.execute(
        'INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, orgId, email, password_hash, first_name, last_name, 'org_admin']
      );

      await conn.commit();

      const token = fastify.jwt.sign({ id: userId, role: 'org_admin', org_id: orgId });

      return reply.code(201).send(success({
        token,
        user: { id: userId, email, role: 'org_admin', first_name, last_name, org_id: orgId },
        org:  { id: orgId, name: organizationName }
      }));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

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
