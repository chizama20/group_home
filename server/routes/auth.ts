import { FastifyInstance } from 'fastify';
import { hashPassword, comparePassword } from '../utils/password';
import { success, failure } from '../utils/response';
import { managerOrAbove } from '../middleware/rbac';
import { Role } from '../types';

interface LoginBody    { email: string; password: string; }
interface RegisterBody { name: string; email: string; password: string; role: Role; phone?: string; position?: string; }

const VALID_ROLES: Role[] = ['owner', 'manager', 'staff'];

export default async (fastify: FastifyInstance): Promise<void> => {

  fastify.post<{ Body: LoginBody }>(
    '/login',
    async (request, reply) => {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.code(400).send(failure('MISSING_FIELDS', 'Email and password are required'));
      }

      fastify.mysql.query(
        'SELECT * FROM users WHERE email = ? AND active = 1',
        [email],
        async (err: Error | null, results: any[]) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));

          const user = results[0];
          if (!user) {
            return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));
          }

          const valid = await comparePassword(password, user.password_hash);
          if (!valid) {
            return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));
          }

          const token = fastify.jwt.sign({
            id:    user.id,
            email: user.email,
            role:  user.role
          });

          reply.send(success({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
          }));
        }
      );
    }
  );

  fastify.post(
    '/logout',
    async (_request, reply) => {
      reply.send(success({ message: 'Logged out successfully' }));
    }
  );

  fastify.post<{ Body: RegisterBody }>(
    '/register',
    { preHandler: [fastify.authenticate, managerOrAbove] },
    async (request, reply) => {
      const { name, email, password, role, phone, position } = request.body;
      const requesterRole = request.user.role;

      if (!name || !email || !password || !role) {
        return reply.code(400).send(failure('MISSING_FIELDS', 'name, email, password, and role are required'));
      }

      if (!VALID_ROLES.includes(role)) {
        return reply.code(400).send(failure('INVALID_ROLE', 'Role must be owner, manager, or staff'));
      }

      // Managers can only create staff accounts
      if (requesterRole === 'manager' && role !== 'staff') {
        return reply.code(403).send(failure('FORBIDDEN', 'Managers can only create staff accounts'));
      }

      fastify.mysql.query(
        'SELECT id FROM users WHERE email = ?',
        [email],
        async (err: Error | null, results: any[]) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          if (results[0]) return reply.code(409).send(failure('EMAIL_TAKEN', 'Email already in use'));

          const password_hash = await hashPassword(password);

          fastify.mysql.query(
            'INSERT INTO users (name, email, password_hash, role, phone, position) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, password_hash, role, phone ?? null, position ?? null],
            (err2: Error | null, result: any) => {
              if (err2) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
              reply.code(201).send(success({ id: result.insertId, name, email, role }));
            }
          );
        }
      );
    }
  );

  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.user;

      fastify.mysql.query(
        'SELECT id, name, email, role, phone, position, created_at FROM users WHERE id = ?',
        [id],
        (err: Error | null, results: any[]) => {
          if (err) return reply.code(500).send(failure('DB_ERROR', 'Database error'));
          if (!results[0]) return reply.code(404).send(failure('NOT_FOUND', 'User not found'));
          reply.send(success(results[0]));
        }
      );
    }
  );
};
