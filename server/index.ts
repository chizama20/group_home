/// <reference path="./types/fastify.d.ts" />
import Fastify from 'fastify';
import dotenv from 'dotenv';

import corsPlugin        from './plugins/cors';
import dbPlugin          from './plugins/db';
import authPlugin        from './plugins/auth';

import authRoutes        from './routes/auth';
import residentsRoutes   from './routes/residents';
import logsRoutes        from './routes/logs';
import medicationsRoutes from './routes/medications';
import incidentsRoutes   from './routes/incidents';
import shiftNotesRoutes  from './routes/shiftNotes';

dotenv.config();

const fastify = Fastify({ logger: true });

// Plugins
fastify.register(corsPlugin);
fastify.register(dbPlugin);
fastify.register(authPlugin);

// Routes
fastify.register(authRoutes,        { prefix: '/auth' });
fastify.register(residentsRoutes,   { prefix: '/residents' });
fastify.register(logsRoutes,        { prefix: '/logs' });
fastify.register(medicationsRoutes, { prefix: '/medications' });
fastify.register(incidentsRoutes,   { prefix: '/incidents' });
fastify.register(shiftNotesRoutes,  { prefix: '/shift-notes' });

const start = async (): Promise<void> => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
