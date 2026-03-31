import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import { FastifyInstance } from 'fastify';

export default fp(async (fastify: FastifyInstance) => {
  if (!process.env.COOKIE_SECRET) {
    throw new Error('COOKIE_SECRET environment variable is not set — server cannot start without it');
  }

  fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET,
    hook: 'onRequest',
  });
});
