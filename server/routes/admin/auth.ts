import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { comparePassword } from '../../utils/password';
import { success, failure } from '../../utils/response';

interface AdminLoginBody { email: string; password: string; }

const ADMIN_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path:     '/',
  maxAge:   60 * 60 * 8, // 8 hours
};

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── POST /admin/auth/login ────────────────────────────────────────────────
  fastify.post<{ Body: AdminLoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'email and password are required'));

    const adminEmail    = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminSecret   = process.env.ADMIN_JWT_SECRET;

    if (!adminEmail || !adminPassword || !adminSecret)
      return reply.code(503).send(failure('NOT_CONFIGURED', 'Admin panel is not configured'));

    const emailMatch = email.toLowerCase() === adminEmail.toLowerCase();

    let passwordMatch = false;
    if (adminPassword.startsWith('$2b$') || adminPassword.startsWith('$2a$')) {
      passwordMatch = await comparePassword(password, adminPassword);
    } else {
      passwordMatch = password === adminPassword;
    }

    if (!emailMatch || !passwordMatch)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const token = jwt.sign({ sub: 'admin' }, adminSecret, { expiresIn: '8h' });

    reply.setCookie('admin_token', token, ADMIN_COOKIE_OPTS);
    return reply.send(success({ message: 'Logged in' }));
  });

  // ── POST /admin/auth/logout ───────────────────────────────────────────────
  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('admin_token', { path: '/' });
    return reply.send(success({ message: 'Logged out' }));
  });
};
