/// <reference path="./types/fastify.d.ts" />
import 'dotenv/config';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';

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
import medicationsRoutes   from './routes/medications';
import incidentsRoutes     from './routes/incidents';
import appointmentsRoutes  from './routes/appointments';
import tasksRoutes         from './routes/tasks';
import exportsRoutes       from './routes/exports';

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
  errorResponseBuilder: (_request, context) => ({
    success: false,
    error: {
      code:    'RATE_LIMITED',
      message: `Too many login attempts. Try again in ${context.after}.`,
    },
  }),
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
fastify.register(medicationsRoutes,   { prefix: '/medications' });
fastify.register(incidentsRoutes,     { prefix: '/incidents' });
fastify.register(appointmentsRoutes,  { prefix: '/appointments' });
fastify.register(tasksRoutes,         { prefix: '/tasks' });
fastify.register(exportsRoutes,       { prefix: '/exports' });

// Admin routes — env-based auth, no DB lookup
fastify.register(adminAuthRoutes,   { prefix: '/admin/auth' });
fastify.register(adminOrgReqRoutes, { prefix: '/admin/org-requests' });
fastify.register(adminOrgsRoutes,   { prefix: '/admin/orgs' });

const start = async (): Promise<void> => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
