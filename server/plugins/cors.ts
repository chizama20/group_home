import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(cors, {
    origin:      process.env.APP_URL ?? 'http://localhost:5173',
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true, // Required for httpOnly cookie to be sent cross-origin
  });
});
