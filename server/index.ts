/// <reference path="./types/fastify.d.ts" />
import 'dotenv/config';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { FastifyRequest } from 'fastify';

import corsPlugin          from './plugins/cors';
import cookiePlugin        from './plugins/cookie';
import dbPlugin            from './plugins/db';
import authPlugin          from './plugins/auth';
import sessionMiddleware   from './middleware/session';
import adminAuthMiddleware from './middleware/adminAuth';

import authRoutes          from './routes/auth';
import registerRoutes      from './routes/register';
import orgsRoutes          from './routes/orgs';
import organizationsRoutes from './routes/organizations';
import usersRoutes         from './routes/users';
import homesRoutes         from './routes/homes';
import residentsRoutes     from './routes/residents';
import contactsRoutes      from './routes/contacts';
import goalsRoutes         from './routes/goals';
import vitalsConfigRoutes  from './routes/vitalsConfig';
import medicationsRoutes   from './routes/medications';
import announcementsRoutes  from './routes/announcements';
import appointmentsRoutes  from './routes/appointments';
import auditRoutes         from './routes/audit';
import invitesRoutes       from './routes/invites';
import iposLogsRoutes      from './routes/iposLogs';
import iposEntriesRoutes   from './routes/iposEntries';
import dayProgramLogsRoutes from './routes/dayProgramLogs';
import vitalsLogsRoutes    from './routes/vitalsLogs';
import scheduleRoutes      from './routes/schedule';

import adminAuthRoutes     from './routes/admin/auth';
import adminOrgReqRoutes   from './routes/admin/orgRequests';
import adminOrgsRoutes     from './routes/admin/orgs';

const fastify = Fastify({ logger: true });

// Plugins — cookie must be registered before auth
fastify.register(corsPlugin);
fastify.register(cookiePlugin);
fastify.register(dbPlugin);
fastify.register(authPlugin);
fastify.register(adminAuthMiddleware);
fastify.register(sessionMiddleware);

// Rate limiting — global: false means routes must opt-in via config.rateLimit
fastify.register(rateLimit, {
  global: false,
  errorResponseBuilder: (_request: FastifyRequest, context: { after: string; max: number; ttl: number }) => ({
    success: false,
    error: {
      code:    'RATE_LIMITED',
      message: `Too many login attempts. Try again in ${context.after}.`,
    },
  }),
});

// Global error handler
fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
  fastify.log.error({
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  // Validation errors (Fastify schema or Zod)
  if (error.validation || error.name === 'ZodError') {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Invalid request data',
      },
    });
  }

  // Authentication errors
  if (error.statusCode === 401 || error.message.includes('unauthorized')) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  // Forbidden errors
  if (error.statusCode === 403) {
    return reply.code(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
      },
    });
  }

  // Default to 500 for all other errors
  return reply.code(500).send({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
    },
  });
});

// Health check — no auth required
fastify.get('/health', async (_request, reply) => {
  try {
    await fastify.db.execute('SELECT 1');
    return reply.send({ status: 'ok', db: 'connected' });
  } catch {
    return reply.code(503).send({ status: 'error', db: 'disconnected' });
  }
});

// Public routes
fastify.register(authRoutes,     { prefix: '/auth' });
fastify.register(registerRoutes, { prefix: '/register' });

// App routes
fastify.register(orgsRoutes,          { prefix: '/orgs' });
fastify.register(organizationsRoutes, { prefix: '/organizations' });
fastify.register(usersRoutes,         { prefix: '/users' });
fastify.register(homesRoutes,         { prefix: '/homes' });
fastify.register(residentsRoutes,     { prefix: '/residents' });
fastify.register(contactsRoutes,      { prefix: '/contacts' });
fastify.register(goalsRoutes,         { prefix: '/goals' });
fastify.register(vitalsConfigRoutes,  { prefix: '/vitals-config' });
fastify.register(medicationsRoutes,   { prefix: '/medications' });
fastify.register(announcementsRoutes,  { prefix: '/announcements' });
fastify.register(appointmentsRoutes,  { prefix: '/appointments' });
fastify.register(auditRoutes,         { prefix: '/audit-logs' });
fastify.register(invitesRoutes,       { prefix: '/invites' });
fastify.register(iposLogsRoutes,       { prefix: '/ipos-logs' });
fastify.register(iposEntriesRoutes,    { prefix: '/ipos-entries' });
fastify.register(dayProgramLogsRoutes, { prefix: '/day-program-logs' });
fastify.register(vitalsLogsRoutes,     { prefix: '/vitals-logs' });
fastify.register(scheduleRoutes,       { prefix: '/' });

// Admin routes — env-based auth, no DB lookup
fastify.register(adminAuthRoutes,   { prefix: '/admin/auth' });
fastify.register(adminOrgReqRoutes, { prefix: '/admin/org-requests' });
fastify.register(adminOrgsRoutes,   { prefix: '/admin/orgs' });

const validateRequiredEnvVars = (): void => {
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'JWT_SECRET',
    'COOKIE_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file against .env.example');
    process.exit(1);
  }

  // Validate secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  if (process.env.COOKIE_SECRET && process.env.COOKIE_SECRET.length < 32) {
    console.error('COOKIE_SECRET must be at least 32 characters long');
    process.exit(1);
  }
};

const start = async (): Promise<void> => {
  validateRequiredEnvVars();

  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
