import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { failure } from '../utils/response';

export default fp(async (fastify: FastifyInstance) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set — server cannot start without it');
  }

  fastify.register(jwt, {
    secret: process.env.JWT_SECRET
  });

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Read JWT from httpOnly cookie instead of Authorization header
        const token = request.cookies?.token;
        if (!token) {
          return reply.code(401).send(failure('UNAUTHORIZED', 'Invalid or missing token'));
        }
        request.user = fastify.jwt.verify(token);
      } catch (err) {
        reply.code(401).send(failure('UNAUTHORIZED', 'Invalid or missing token'));
      }
    }
  );
});
