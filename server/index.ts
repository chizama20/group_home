/// <reference path="./types/fastify.d.ts" />
import Fastify from 'fastify';
import dotenv from 'dotenv';

import corsPlugin          from './plugins/cors';
import dbPlugin            from './plugins/db';
import authPlugin          from './plugins/auth';

import authRoutes          from './routes/auth';
import orgsRoutes          from './routes/orgs';
import usersRoutes         from './routes/users';
import homesRoutes         from './routes/homes';
import residentsRoutes     from './routes/residents';
import medicationsRoutes   from './routes/medications';
import incidentsRoutes     from './routes/incidents';
import appointmentsRoutes  from './routes/appointments';
import tasksRoutes         from './routes/tasks';
import exportsRoutes       from './routes/exports';

dotenv.config();

const fastify = Fastify({ logger: true });

// Plugins
fastify.register(corsPlugin);
fastify.register(dbPlugin);
fastify.register(authPlugin);

// Routes
fastify.register(authRoutes,         { prefix: '/auth' });
fastify.register(orgsRoutes,         { prefix: '/orgs' });
fastify.register(usersRoutes,        { prefix: '/users' });
fastify.register(homesRoutes,        { prefix: '/homes' });
fastify.register(residentsRoutes,    { prefix: '/residents' });
fastify.register(medicationsRoutes,  { prefix: '/medications' });
fastify.register(incidentsRoutes,    { prefix: '/incidents' });
fastify.register(appointmentsRoutes, { prefix: '/appointments' });
fastify.register(tasksRoutes,        { prefix: '/tasks' });
fastify.register(exportsRoutes,      { prefix: '/exports' });

const start = async (): Promise<void> => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
