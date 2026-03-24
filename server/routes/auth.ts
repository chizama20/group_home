import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { hashPassword, comparePassword } from '../utils/password';
import { success, failure } from '../utils/response';
import { managerOrAbove } from '../middleware/rbac';
import { Role } from '../types';

interface LoginBody    { email: string; password: string; }
interface RegisterBody { name: string; email: string; password: string; role: Role; phone?: string; position?: string; }

const VALID_ROLES: Role[] = ['owner', 'manager', 'staff'];

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'Email and password are required'));

    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? AND active = 1', [email]
    );
    const user = rows[0];

    if (!user)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const valid = await comparePassword(password, user.password_hash);
    if (!valid)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const token = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return reply.send(success({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }));
  });

  fastify.post('/logout', async (_request, reply) => {
    return reply.send(success({ message: 'Logged out successfully' }));
  });

  fastify.post<{ Body: RegisterBody }>(
    '/register',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { name, email, password, role, phone, position } = request.body;
      const requesterRole = request.user.role;

      if (!name || !email || !password || !role)
        return reply.code(400).send(failure('MISSING_FIELDS', 'name, email, password, and role are required'));

      if (!VALID_ROLES.includes(role))
        return reply.code(400).send(failure('INVALID_ROLE', 'Role must be owner, manager, or staff'));

      if (requesterRole === 'manager' && role !== 'staff')
        return reply.code(403).send(failure('FORBIDDEN', 'Managers can only create staff accounts'));

      const [existing] = await fastify.mysql.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?', [email]
      );
      if (existing[0])
        return reply.code(409).send(failure('EMAIL_TAKEN', 'Email already in use'));

      const password_hash = await hashPassword(password);
      const [result] = await fastify.mysql.query<ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role, phone, position) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, password_hash, role, phone ?? null, position ?? null]
      );

      return reply.code(201).send(success({ id: result.insertId, name, email, role }));
    }
  );

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [rows] = await fastify.mysql.query<RowDataPacket[]>(
      'SELECT id, name, email, role, phone, position, created_at FROM users WHERE id = ?',
      [request.user.id]
    );
    if (!rows[0])
      return reply.code(404).send(failure('NOT_FOUND', 'User not found'));

    return reply.send(success(rows[0]));
  });
};
