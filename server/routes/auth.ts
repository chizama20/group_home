import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, comparePassword } from '../utils/password';
import { success, failure } from '../utils/response';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/email';

interface LoginBody         { email: string; password: string; }
interface SignupBody         { organizationName: string; first_name: string; last_name: string; email: string; password: string; }
interface ForgotPasswordBody { email: string; }
interface ResetPasswordBody  { password: string; }

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path:     '/',
  maxAge:   60 * 60 * 24 * 7, // 7 days
};

export default async (fastify: FastifyInstance): Promise<void> => {

  // ── Login ────────────────────────────────────────────────────────────────
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'email and password are required'));

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role,
              u.is_active, u.org_id, u.pin_set_at,
              o.name as org_name, o.status as org_status
       FROM users u
       JOIN orgs o ON u.org_id = o.id
       WHERE u.email = ? AND u.is_active = 1`,
      [email]
    );
    const user = rows[0];

    if (!user)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    const valid = await comparePassword(password, user.password_hash);
    if (!valid)
      return reply.code(401).send(failure('INVALID_CREDENTIALS', 'Invalid email or password'));

    // Block login if org is not active (pending BAA or suspended)
    if (user.org_status && user.org_status !== 'active') {
      const message = user.org_status === 'suspended'
        ? 'Your organisation has been suspended. Contact support.'
        : 'Your account is pending. Check your email to sign the BAA agreement.';
      return reply.code(403).send(failure('ORG_INACTIVE', message));
    }

    const token = fastify.jwt.sign({ id: user.id, role: user.role, org_id: user.org_id });

    reply.setCookie('token', token, COOKIE_OPTS);

    return reply.send(success({
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        first_name: user.first_name,
        last_name:  user.last_name,
        org_id:     user.org_id,
        pin_set_at: user.pin_set_at,
      },
      org: { id: user.org_id, name: user.org_name }
    }));
  });

  // ── Logout ───────────────────────────────────────────────────────────────
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
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

      reply.setCookie('token', token, COOKIE_OPTS);

      return reply.code(201).send(success({
        user: { id: userId, email, role: 'org_admin', first_name, last_name, org_id: orgId, pin_set_at: null },
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
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_active, u.pin_set_at, u.created_at,
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
      id:         row.id,
      first_name: row.first_name,
      last_name:  row.last_name,
      email:      row.email,
      role:       row.role,
      is_active:  row.is_active,
      pin_set_at: row.pin_set_at,
      org:        { id: row.o_id, name: row.o_name }
    }));
  });

  // ── Forgot Password ──────────────────────────────────────────────────────
  fastify.post<{ Body: ForgotPasswordBody }>('/forgot-password', async (request, reply) => {
    const { email } = request.body;

    // Always return 200 — prevents account enumeration
    if (!email) return reply.send(success({ message: 'If an account exists, a reset link has been sent' }));

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      'SELECT id, first_name FROM users WHERE email = ? AND is_active = 1',
      [email]
    );
    const user = rows[0];

    if (user) {
      const token     = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await fastify.db.execute(
        'INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [uuidv4(), user.id, token, expiresAt]
      );

      const resetUrl = `${process.env.APP_URL}/reset-password/${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    }

    return reply.send(success({ message: 'If an account exists, a reset link has been sent' }));
  });

  // ── Reset Password ───────────────────────────────────────────────────────
  fastify.post<{ Params: { token: string }; Body: ResetPasswordBody }>(
    '/reset-password/:token',
    async (request, reply) => {
      const { token } = request.params;
      const { password } = request.body;

      if (!password || password.length < 8)
        return reply.code(400).send(failure('INVALID_PASSWORD', 'Password must be at least 8 characters'));

      const [rows] = await fastify.db.execute<RowDataPacket[]>(
        'SELECT id, user_id FROM password_resets WHERE token = ? AND used_at IS NULL AND expires_at > NOW()',
        [token]
      );
      const reset = rows[0];

      if (!reset)
        return reply.code(400).send(failure('INVALID_TOKEN', 'Reset link is invalid or has expired'));

      const password_hash = await hashPassword(password);

      const conn = await fastify.db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, reset.user_id]);
        await conn.execute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [reset.id]);
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return reply.send(success({ message: 'Password updated successfully' }));
    }
  );

  // ── Validate Invite Token ────────────────────────────────────────────────
  fastify.get<{ Params: { token: string } }>('/invite/:token', async (request, reply) => {
    const { token } = request.params;

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT i.id, i.email, i.role, i.home_id, i.expires_at,
              o.name as org_name
       FROM invitations i
       JOIN orgs o ON i.org_id = o.id
       WHERE i.token = ? AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
      [token]
    );
    const invite = rows[0];

    if (!invite)
      return reply.code(400).send(failure('INVALID_TOKEN', 'Invite link is invalid or has expired'));

    return reply.send(success({
      email:    invite.email,
      role:     invite.role,
      org_name: invite.org_name,
    }));
  });

  // ── Accept Invite ────────────────────────────────────────────────────────
  fastify.post<{
    Params: { token: string };
    Body:   { first_name: string; last_name: string; password: string };
  }>('/invite/:token', async (request, reply) => {
    const { token } = request.params;
    const { first_name, last_name, password } = request.body;

    if (!first_name || !last_name || !password)
      return reply.code(400).send(failure('MISSING_FIELDS', 'first_name, last_name, and password are required'));

    if (password.length < 8)
      return reply.code(400).send(failure('INVALID_PASSWORD', 'Password must be at least 8 characters'));

    const [rows] = await fastify.db.execute<RowDataPacket[]>(
      `SELECT i.id, i.email, i.role, i.org_id, i.home_id, i.invited_by
       FROM invitations i
       WHERE i.token = ? AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
      [token]
    );
    const invite = rows[0];

    if (!invite)
      return reply.code(400).send(failure('INVALID_TOKEN', 'Invite link is invalid or has expired'));

    const conn = await fastify.db.getConnection();
    try {
      await conn.beginTransaction();

      const userId        = uuidv4();
      const password_hash = await hashPassword(password);

      await conn.execute(
        'INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, invite.org_id, invite.email, password_hash, first_name, last_name, invite.role, invite.invited_by]
      );

      if (invite.home_id) {
        await conn.execute(
          'INSERT INTO home_staff (home_id, user_id) VALUES (?, ?)',
          [invite.home_id, userId]
        );
      }

      await conn.execute(
        'UPDATE invitations SET accepted_at = NOW() WHERE id = ?',
        [invite.id]
      );

      await conn.commit();

      const jwtToken = fastify.jwt.sign({ id: userId, role: invite.role, org_id: invite.org_id });
      reply.setCookie('token', jwtToken, COOKIE_OPTS);

      return reply.code(201).send(success({
        user: { id: userId, email: invite.email, role: invite.role, first_name, last_name, org_id: invite.org_id, pin_set_at: null },
        org:  { id: invite.org_id }
      }));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
};
